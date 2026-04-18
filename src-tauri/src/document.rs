use serde::{Deserialize, Serialize};

/// 현재 열려 있는 문서의 상태
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentState {
    pub file_path: Option<String>,
    pub file_name: String,
    pub is_modified: bool,
    pub char_count: usize,
    pub paragraph_count: usize,
    pub html_content: String,
}

impl Default for DocumentState {
    fn default() -> Self {
        Self {
            file_path: None,
            file_name: "새 문서".to_string(),
            is_modified: false,
            char_count: 0,
            paragraph_count: 0,
            html_content: String::new(),
        }
    }
}
