use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DeterministicTags {
    pub source_filename: String,
    pub extraction_timestamp: String,
    pub document_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SemanticTags {
    pub technologies: Vec<String>,
    pub semantic_tags: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MergedFrontmatter {
    #[serde(flatten)]
    pub deterministic: DeterministicTags,
    #[serde(flatten)]
    pub semantic: SemanticTags,
}

pub fn merge_frontmatter(deterministic: DeterministicTags, semantic_yaml: &str) -> String {
    let semantic: SemanticTags =
        serde_yaml::from_str(semantic_yaml).unwrap_or_else(|_| SemanticTags {
            technologies: vec!["unknown".to_string()],
            semantic_tags: vec![],
        });

    let merged = MergedFrontmatter {
        deterministic,
        semantic,
    };
    let yaml = serde_yaml::to_string(&merged).unwrap_or_default();

    format!("---\n{}\n---\n", yaml.trim())
}

#[cfg(test)]
mod tests {
    use super::{merge_frontmatter, DeterministicTags};

    #[test]
    fn closes_frontmatter_on_a_new_line() {
        let frontmatter = merge_frontmatter(
            DeterministicTags {
                source_filename: "demo.pdf".to_string(),
                extraction_timestamp: "2026-03-20T12:00:00Z".to_string(),
                document_type: "pdf".to_string(),
            },
            "technologies:\n  - java-6\nsemantic_tags:\n  - hash-tables",
        );

        assert!(frontmatter.contains("- hash-tables\n---\n"));
    }
}
