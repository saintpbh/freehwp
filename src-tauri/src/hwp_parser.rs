use serde::Serialize;
use std::fs;

#[derive(Debug, Clone, Serialize)]
pub struct HwpParagraph {
    pub text: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct HwpDocument {
    pub paragraphs: Vec<HwpParagraph>,
    pub raw_html: String,
    pub plain_text: String,
    pub char_count: usize,
    pub paragraph_count: usize,
}

/// HWP/HWPX 파일을 파싱하여 HwpDocument 구조체로 변환 (rhwp 엔진 기반)
pub fn parse_hwp(file_path: &str) -> Result<HwpDocument, String> {
    let data = fs::read(file_path).map_err(|e| format!("파일 읽기 실패: {}", e))?;
    
    let mut paragraphs = Vec::new();
    let mut html = String::from("<div class='hwp-doc'>");
    let mut plain = String::new();

    // rhwp 파서 엔진을 사용하여 HWP/HWPX 바이너리를 AST 트리로 파싱
    match rhwp::wasm_api::HwpDocument::from_bytes(&data) {
        Ok(doc) => {
            let document = doc.document();
            for section in &document.sections {
                for para in &section.paragraphs {
                    process_paragraph(para, &mut html, &mut plain, &mut paragraphs);
                }
            }
        }
        Err(e) => {
            return Err(format!("문서 파싱 실패 (엔진 오류): {}", e));
        }
    }

    html.push_str("</div>");

    let char_count = plain.chars().filter(|c| !c.is_whitespace()).count();
    let paragraph_count = paragraphs.len();

    Ok(HwpDocument {
        paragraphs,
        raw_html: html,
        plain_text: plain,
        char_count,
        paragraph_count,
    })
}

/// 재귀적으로 문단(Paragraph) 노드를 순회하여 HTML, PlainText를 추출하는 함수
fn process_paragraph(
    para: &rhwp::model::paragraph::Paragraph,
    html: &mut String,
    plain: &mut String,
    paragraphs: &mut Vec<HwpParagraph>,
) {
    // 1. 제어 문자(\x00 ~ \x1F)를 제외하고 출력 가능한 텍스트만 필터링 (다만 탭, 줄바꿈은 허용)
    // rhwp는 UTF-16LE 텍스트를 파싱하므로, 기존 파서의 한글 깨짐 현상이 원천적으로 해결됨.
    let clean_text: String = para.text
        .chars()
        .filter(|&c| c >= ' ' || c == '\n' || c == '\t')
        .collect();
    
    // Tiptap에서는 앞뒤 공백 여부가 빈 블록을 결정하므로 trim
    let trimmed = clean_text.trim();
    
    // 문단에 텍스트도 없고 컨트롤 개체도 없다면 빈 줄
    if trimmed.is_empty() && para.controls.is_empty() {
        html.push_str("<p><br></p>");
        plain.push('\n');
        paragraphs.push(HwpParagraph { text: String::new() });
    } else if !trimmed.is_empty() {
        let escaped = trimmed
            .replace('&', "&amp;")
            .replace('<', "&lt;")
            .replace('>', "&gt;");
        html.push_str(&format!("<p>{}</p>", escaped));
        plain.push_str(trimmed);
        plain.push('\n');
        paragraphs.push(HwpParagraph { text: trimmed.to_string() });
    }

    // 2. 컨트롤 영역 순회 (표/도형/이미지 등)
    // Tiptap 렌더링에 적합하게 Table 개체를 HTML 테이블 형식으로 매핑
    for ctrl in &para.controls {
        match ctrl {
            rhwp::model::control::Control::Table(table) => {
                html.push_str("<table border='1' style='border-collapse: collapse; width: 100%; margin-top: 1em; margin-bottom: 1em;'>");
                html.push_str("<tbody>");
                
                for r in 0..table.row_count {
                    html.push_str("<tr>");
                    // 현재 순회중인 행(row)에 해당하는 셀을 추출하고, 열(col) 순서대로 정렬
                    let mut row_cells: Vec<_> = table.cells.iter().filter(|c| c.row == r).collect();
                    row_cells.sort_by_key(|c| c.col);
                    
                    for cell in row_cells {
                        // 셀 병합 속성 처리
                        let rowspan = if cell.row_span > 1 { format!(" rowspan='{}'", cell.row_span) } else { String::new() };
                        let colspan = if cell.col_span > 1 { format!(" colspan='{}'", cell.col_span) } else { String::new() };
                        
                        html.push_str(&format!("<td{}{}>", rowspan, colspan));
                        
                        // 셀 내부는 HWP에서 독립된 문단 트리(Paragraph Array)를 가지므로 재귀 파싱
                        for cell_para in &cell.paragraphs {
                            process_paragraph(cell_para, html, plain, paragraphs);
                        }
                        
                        html.push_str("</td>");
                    }
                    
                    html.push_str("</tr>");
                }
                
                html.push_str("</tbody></table>");
            }
            _ => {
                // Table 외의 컨트롤 (Picture, Equation, Shape 등)은 현재 Phase에서는 래핑 생략
            }
        }
    }
}
