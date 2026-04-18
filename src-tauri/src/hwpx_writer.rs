use std::fs::File;
use std::io::Write;
use zip::write::SimpleFileOptions;
use zip::ZipWriter;

/// HTML 콘텐츠를 HWPX(ZIP+XML) 형식으로 저장
pub fn save_as_hwpx(file_path: &str, html_content: &str, title: &str) -> Result<(), String> {
    let file = File::create(file_path)
        .map_err(|e| format!("파일 생성 실패: {}", e))?;

    let mut zip = ZipWriter::new(file);
    let options = SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    // 1. mimetype (비압축)
    let mime_options = SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Stored);
    zip.start_file("mimetype", mime_options)
        .map_err(|e| format!("mimetype 쓰기 실패: {}", e))?;
    zip.write_all(b"application/hwp+zip")
        .map_err(|e| format!("mimetype 쓰기 실패: {}", e))?;

    // 2. META-INF/manifest.xml
    zip.start_file("META-INF/manifest.xml", options)
        .map_err(|e| format!("manifest 쓰기 실패: {}", e))?;
    let manifest = r#"<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0">
  <manifest:file-entry manifest:media-type="application/hwp+zip" manifest:full-path="/"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="Contents/content.hpf"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="Contents/header.xml"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="Contents/section0.xml"/>
</manifest:manifest>"#;
    zip.write_all(manifest.as_bytes())
        .map_err(|e| format!("manifest 쓰기 실패: {}", e))?;

    // 3. Contents/content.hpf (패키지 정보)
    zip.start_file("Contents/content.hpf", options)
        .map_err(|e| format!("content.hpf 쓰기 실패: {}", e))?;
    let hpf = format!(r#"<?xml version="1.0" encoding="UTF-8"?>
<opf:package xmlns:opf="http://www.idpf.org/2007/opf" version="1.0">
  <opf:metadata>
    <opf:title>{}</opf:title>
    <opf:creator>맘편한설교노트</opf:creator>
    <opf:date>{}</opf:date>
  </opf:metadata>
  <opf:manifest>
    <opf:item id="header" href="header.xml" media-type="text/xml"/>
    <opf:item id="section0" href="section0.xml" media-type="text/xml"/>
  </opf:manifest>
  <opf:spine>
    <opf:itemref idref="section0"/>
  </opf:spine>
</opf:package>"#, title, chrono_now());
    zip.write_all(hpf.as_bytes())
        .map_err(|e| format!("content.hpf 쓰기 실패: {}", e))?;

    // 4. Contents/header.xml
    zip.start_file("Contents/header.xml", options)
        .map_err(|e| format!("header.xml 쓰기 실패: {}", e))?;
    let header = r#"<?xml version="1.0" encoding="UTF-8"?>
<hp:head xmlns:hp="http://www.hancom.co.kr/hwpml/2011/head">
  <hp:beginNum page="1" footnote="1" endnote="1"/>
  <hp:refList>
    <hp:fontfaces>
      <hp:fontface lang="HANGUL">
        <hp:font face="KoPub바탕체 Medium" type="TTF"/>
      </hp:fontface>
    </hp:fontfaces>
    <hp:charProperties>
      <hp:charPr id="0" height="1000" bold="false" italic="false" underline="NONE"/>
    </hp:charProperties>
    <hp:paraProperties>
      <hp:paraPr id="0" align="JUSTIFY">
        <hp:spacing line="160" lineType="PERCENT"/>
      </hp:paraPr>
    </hp:paraProperties>
  </hp:refList>
</hp:head>"#;
    zip.write_all(header.as_bytes())
        .map_err(|e| format!("header.xml 쓰기 실패: {}", e))?;

    // 5. Contents/section0.xml — HTML을 HWPX 본문 XML로 변환
    zip.start_file("Contents/section0.xml", options)
        .map_err(|e| format!("section0.xml 쓰기 실패: {}", e))?;
    let section_xml = html_to_hwpx_section(html_content)?;
    zip.write_all(section_xml.as_bytes())
        .map_err(|e| format!("section0.xml 쓰기 실패: {}", e))?;

    zip.finish().map_err(|e| format!("ZIP 마무리 실패: {}", e))?;
    Ok(())
}

fn html_to_hwpx_section(html: &str) -> Result<String, String> {
    let mut xml = String::from(r#"<?xml version="1.0" encoding="UTF-8"?>
<hs:sec xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section">"#);

    // HTML 태그 제거 후 문단별로 HWPX paragraph 엘리먼트 생성
    let plain = html
        .replace("<br>", "\n").replace("<br/>", "\n").replace("<br />", "\n")
        .replace("</p>", "\n").replace("</div>", "\n")
        .replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">");

    // HTML 태그 제거
    let tag_re = regex::Regex::new(r"<[^>]+>").map_err(|e| format!("정규식 오류: {}", e))?;
    let cleaned = tag_re.replace_all(&plain, "");

    for line in cleaned.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() { continue; }
        let escaped = trimmed.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;");
        xml.push_str(&format!(r#"
  <hs:p paraPrIDRef="0">
    <hs:run charPrIDRef="0">
      <hs:t>{}</hs:t>
    </hs:run>
  </hs:p>"#, escaped));
    }

    xml.push_str("\n</hs:sec>");
    Ok(xml)
}

fn chrono_now() -> String {
    // 간단한 날짜 생성 (chrono 미사용)
    "2026-04-18T00:00:00".to_string()
}
