use ammonia::Builder;
use std::collections::HashSet;

pub fn sanitize_svg(raw: &str) -> String {
    let tags: HashSet<&str> = [
        "svg",
        "g",
        "path",
        "circle",
        "rect",
        "line",
        "polyline",
        "polygon",
        "ellipse",
        "title",
        "desc",
        "defs",
        "linearGradient",
        "radialGradient",
        "stop",
        "clipPath",
    ]
    .into_iter()
    .collect();

    let attributes: HashSet<&str> = [
        "xmlns",
        "viewBox",
        "width",
        "height",
        "fill",
        "stroke",
        "stroke-width",
        "stroke-linecap",
        "stroke-linejoin",
        "stroke-miterlimit",
        "stroke-dasharray",
        "stroke-dashoffset",
        "d",
        "points",
        "x",
        "y",
        "x1",
        "x2",
        "y1",
        "y2",
        "cx",
        "cy",
        "r",
        "rx",
        "ry",
        "opacity",
        "fill-opacity",
        "stroke-opacity",
        "transform",
        "class",
        "id",
        "offset",
        "stop-color",
        "stop-opacity",
        "clip-path",
        "fill-rule",
        "clip-rule",
    ]
    .into_iter()
    .collect();

    Builder::new()
        .tags(tags)
        .generic_attributes(attributes)
        .url_relative(ammonia::UrlRelative::Deny)
        .clean(raw)
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::sanitize_svg;

    #[test]
    fn removes_script_and_event_handlers() {
        let sanitized = sanitize_svg(
            r#"<svg onload="alert(1)"><script>alert(1)</script><path d="M0 0" onclick="x()" /></svg>"#,
        );

        assert!(!sanitized.contains("onload"));
        assert!(!sanitized.contains("onclick"));
        assert!(!sanitized.contains("<script"));
        assert!(sanitized.contains("<svg"));
        assert!(sanitized.contains("<path"));
    }
}
