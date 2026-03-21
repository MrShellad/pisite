use axum::{
    body::Body,
    http::{Request, StatusCode},
    middleware::Next,
    response::Response,
};
use std::net::{IpAddr, Ipv4Addr, Ipv6Addr, SocketAddr};

fn parse_first_ip_from_header(req: &Request<Body>, header_name: &str) -> Option<IpAddr> {
    let raw = req.headers().get(header_name)?.to_str().ok()?;
    raw.split(',').next()?.trim().parse::<IpAddr>().ok()
}

fn peer_ip(req: &Request<Body>) -> Option<IpAddr> {
    req.extensions()
        .get::<axum::extract::ConnectInfo<SocketAddr>>()
        .map(|ci| ci.0.ip())
}

fn forwarded_ip(req: &Request<Body>) -> Option<IpAddr> {
    parse_first_ip_from_header(req, "x-forwarded-for")
        .or_else(|| parse_first_ip_from_header(req, "x-real-ip"))
}

fn client_ip(req: &Request<Body>) -> Option<IpAddr> {
    let peer = peer_ip(req);
    let forwarded = forwarded_ip(req);

    match peer {
        Some(ip) if is_internal_ip(ip) => forwarded.or(Some(ip)),
        Some(ip) => Some(ip),
        None => forwarded,
    }
}

fn is_internal_ipv4(ip: Ipv4Addr) -> bool {
    ip.is_private() || ip.is_loopback() || ip.is_link_local()
}

fn is_internal_ipv6(ip: Ipv6Addr) -> bool {
    if let Some(v4) = ip.to_ipv4() {
        return is_internal_ipv4(v4);
    }
    ip.is_unique_local() || ip.is_loopback() || ip.is_unicast_link_local()
}

fn is_internal_ip(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(v4) => is_internal_ipv4(v4),
        IpAddr::V6(v6) => is_internal_ipv6(v6),
    }
}

pub async fn admin_internal_only_middleware(
    req: Request<Body>,
    next: Next,
) -> Result<Response, StatusCode> {
    let path = req.uri().path();
    let is_admin_path = path.starts_with("/api/admin");

    if !is_admin_path {
        return Ok(next.run(req).await);
    }

    if client_ip(&req).is_some_and(is_internal_ip) {
        return Ok(next.run(req).await);
    }

    let response = Response::builder()
        .status(StatusCode::FORBIDDEN)
        .body(Body::from("Admin API is only accessible from internal networks"))
        .unwrap();

    Ok(response)
}
