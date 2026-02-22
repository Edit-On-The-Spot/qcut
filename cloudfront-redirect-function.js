/**
 * CloudFront Function: SEO path redirects (viewer-request event)
 *
 * Redirects old short feature paths to new SEO-friendly paths with HTTP 301.
 * Deploy this as a CloudFront Function attached to the viewer-request event
 * on the qcut.app distribution.
 *
 * Deployment steps:
 *   1. AWS Console → CloudFront → Functions → Create function
 *   2. Paste this code, publish the function
 *   3. Associate with the distribution's viewer-request event (all paths)
 */
var REDIRECTS = {
  "/trim": "/trim-video-online-free",
  "/convert": "/convert-video-no-watermark",
  "/compress": "/compress-video-online-free",
  "/resize": "/resize-video-without-cropping",
  "/extract-audio": "/extract-audio-from-video-online",
  "/merge": "/merge-videos-audios-online-free",
  "/combine": "/combine-clips-for-free",
  "/frame-extract": "/extract-frame-from-video-online",
  "/gif": "/create-gif-from-any-clip",
  "/normalize-audio": "/audio-leveler-online",
  "/rotate": "/flip-and-rotate-video-orientation",
  "/overlay": "/veed-watermark-alternative",
}

function handler(event) {
  var request = event.request
  var uri = request.uri

  var target = REDIRECTS[uri]
  if (target) {
    return {
      statusCode: 301,
      statusDescription: "Moved Permanently",
      headers: {
        location: { value: target },
        "cache-control": { value: "max-age=31536000" },
      },
    }
  }

  return request
}
