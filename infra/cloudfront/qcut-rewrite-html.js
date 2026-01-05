function handler(event) {
  var req = event.request;
  var uri = req.uri;

  if (uri.endsWith("/")) {
    req.uri = uri + "index.html";
    return req;
  }

  if (!uri.includes(".")) {
    req.uri = uri + ".html";
  }

  return req;
}
