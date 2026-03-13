pub const NODE_DIST: &str = "https://npmmirror.com/mirrors/node/";
pub const GIT_BINARY: &str = "https://registry.npmmirror.com/-/binary/git-for-windows/";
pub const NPM_REGISTRY: &str = "https://registry.npmmirror.com";

pub struct MirrorConfig {
    pub node_dist: String,
    pub git_binary: String,
    pub npm_registry: String,
}

impl Default for MirrorConfig {
    fn default() -> Self {
        Self {
            node_dist: NODE_DIST.into(),
            git_binary: GIT_BINARY.into(),
            npm_registry: NPM_REGISTRY.into(),
        }
    }
}
