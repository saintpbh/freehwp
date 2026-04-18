use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use regex::Regex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BibleVerse {
    pub id: i32,
    pub book: String,
    pub chapter: i32,
    pub verse: i32,
    pub text: String,
    pub title: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BibleSearchResult {
    pub verses: Vec<BibleVerse>,
    pub total: usize,
}

pub fn search_bible(conn: &Connection, query: &str) -> Result<BibleSearchResult, String> {
    let re = Regex::new(r"^([가-힣\d]+)\s*(\d+)[:\s]+(\d+)(?:-(\d+))?$")
        .map_err(|e| format!("정규식 오류: {}", e))?;

    if let Some(caps) = re.captures(query) {
        let book_part = &caps[1];
        let chapter: i32 = caps[2].parse().unwrap_or(0);
        let start_verse: i32 = caps[3].parse().unwrap_or(0);
        let end_verse: i32 = caps.get(4).map(|m| m.as_str().parse().unwrap_or(start_verse)).unwrap_or(start_verse);

        let mut stmt = conn.prepare("
            SELECT v.id, b.name as book, v.chapter, v.verse, v.content as text, v.title
            FROM verses v
            JOIN books b ON v.book_id = b.id
            WHERE (b.abbreviation = ?1 OR b.name = ?1)
              AND v.chapter = ?2 AND v.verse >= ?3 AND v.verse <= ?4
            ORDER BY v.verse ASC
        ").map_err(|e| e.to_string())?;

        let verse_iter = stmt.query_map(params![book_part, chapter, start_verse, end_verse], |row| {
            Ok(BibleVerse {
                id: row.get(0)?,
                book: row.get(1)?,
                chapter: row.get(2)?,
                verse: row.get(3)?,
                text: row.get(4)?,
                title: row.get(5)?,
            })
        }).map_err(|e| e.to_string())?;

        let mut verses = Vec::new();
        for v in verse_iter {
            verses.push(v.map_err(|e| e.to_string())?);
        }
        let total = verses.len();
        Ok(BibleSearchResult { verses, total })
    } else {
        let mut stmt = conn.prepare("
            SELECT v.id, b.name as book, v.chapter, v.verse, v.content as text, v.title
            FROM verses v
            JOIN books b ON v.book_id = b.id
            WHERE v.content LIKE ?1
            ORDER BY b.id, v.chapter, v.verse
            LIMIT 100
        ").map_err(|e| e.to_string())?;

        let like_query = format!("%{}%", query);
        let verse_iter = stmt.query_map(params![like_query], |row| {
            Ok(BibleVerse {
                id: row.get(0)?,
                book: row.get(1)?,
                chapter: row.get(2)?,
                verse: row.get(3)?,
                text: row.get(4)?,
                title: row.get(5)?,
            })
        }).map_err(|e| e.to_string())?;

        let mut verses = Vec::new();
        for v in verse_iter {
            verses.push(v.map_err(|e| e.to_string())?);
        }
        let total = verses.len();
        Ok(BibleSearchResult { verses, total })
    }
}
