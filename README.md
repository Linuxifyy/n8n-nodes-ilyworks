# n8n-nodes-ilyworks

An [n8n](https://n8n.io) community node for [Ilyworks](https://api.ilyworks.nl) — a free, EU-hosted image and video transformation API.

Transform images, transcode videos, export for social platforms, and extract thumbnails — all from your n8n workflows, no infrastructure needed.

---

## Installation

In your n8n instance:

1. Go to **Settings → Community Nodes**
2. Click **Install**
3. Enter `n8n-nodes-ilyworks`
4. Click **Install**

---

## Credentials

1. Get a free API key at **[api.ilyworks.nl](https://api.ilyworks.nl)**
2. In n8n, go to **Credentials → New → Ilyworks API**
3. Paste your API key
4. The Base URL defaults to `https://api.ilyworks.nl` — leave it unless you self-host

---

## Resources & Operations

### Image

| Operation | Description |
|---|---|
| **Transform URL** | Fetch an image from a URL, apply transformations, get back binary or a URL |
| **Upload & Transform** | Upload a binary image from your workflow and transform it |
| **Get Info** | Get metadata (width, height, format, file size) for any image URL |

### Video

| Operation | Description |
|---|---|
| **Transcode** | Convert, resize, trim, or change format of a video |
| **Platform Export** | Re-encode a video optimised for TikTok, Instagram Reels, YouTube, Instagram, or Twitter |
| **Extract Thumbnail** | Pull a single frame from a video as a JPEG, PNG, or WebP image |

### Job

Video operations are async — they return a `jobId`. Use these to handle the result:

| Operation | Description |
|---|---|
| **Get Status** | Check the current status and progress of a video job |
| **Wait Until Done** | Poll automatically until the job completes, then continue the workflow |
| **Download Result** | Download the finished video as a binary file |

---

## Usage Examples

### Resize & convert an image to WebP

1. Add an **Ilyworks** node
2. Resource: `Image` → Operation: `Transform URL`
3. Set **Image URL** to your source image
4. Set **Width** to `800`, **Format** to `WebP`
5. Set **Return As** to `Binary (Image File)`

The output binary can be passed directly to a subsequent node (e.g. write to disk, upload to S3, send via email).

---

### Export a video for TikTok

1. Add an **Ilyworks** node
2. Resource: `Video` → Operation: `Platform Export`
3. Set **Video URL** to your source video
4. Set **Platform** to `TikTok — 1080×1920 (9:16)`
5. Connect a second **Ilyworks** node:
   - Resource: `Job` → Operation: `Wait Until Done`
   - Set **Job ID** to `{{ $json.jobId }}`
6. Connect a third **Ilyworks** node:
   - Resource: `Job` → Operation: `Download Result`
   - Set **Job ID** to `{{ $json.jobId }}`

The final node outputs the re-encoded video as a binary ready for upload.

---

### Extract a thumbnail from a video

1. Add an **Ilyworks** node
2. Resource: `Video` → Operation: `Extract Thumbnail`
3. Set **Video URL** to your source video
4. Set **Timestamp (Seconds)** to e.g. `5` to grab the frame at 5 seconds
5. Set **Thumbnail Format** to `JPEG`

Returns a job — follow the same Job → Wait → Download pattern above.

---

## Image Transform Options

All options are available under **Additional Options** in the image operations:

| Option | Description |
|---|---|
| Width / Height | Output dimensions in pixels |
| Format | `WebP` (default), `AVIF`, `JPEG`, `PNG`, `GIF` |
| Fit | How to fit into dimensions: `Cover`, `Contain`, `Fill`, `Inside`, `Outside` |
| Quality | 1–100 (default 80) |
| Blur | Gaussian blur sigma (0.3–1000) |
| Sharpen | Sharpen amount |
| Grayscale | Convert to black & white |
| Sepia | Apply sepia tone |
| Negate | Invert colors |
| Flip / Flop | Mirror vertically / horizontally |
| Rotate | Rotate by degrees |
| Brightness / Contrast / Saturation / Hue | Adjust colour properties |
| Watermark Text | Overlay text on the image |
| Watermark Position | Where to place the watermark |
| Padding | Add transparent padding in pixels |
| Border Width / Color | Add a solid border |
| Corner Radius | Round corners (WebP/PNG only) |
| Background Color | Fill transparent areas |
| Auto-Trim Whitespace | Crop edges of uniform color |

---

## Video Transcode Options

| Option | Description |
|---|---|
| Width / Height | Output dimensions in pixels |
| Format | `MP4` (default) or `WebM` |
| Framerate | Output FPS |
| Trim Start / End | Cut the video to a time range (seconds) |
| Quality CRF | 0–51, lower = better quality (default 23) |
| Include Audio | Keep or strip audio track |
| Strip Metadata | Remove all metadata from the file (default on) |

---

## Self-Hosting

Ilyworks is open source. If you run your own instance, set the **Base URL** in your credentials to your own server URL (e.g. `https://media.yourdomain.com`).

Source code: [github.com/Linuxifyy/ilyworks-media-api](https://github.com/Linuxifyy/ilyworks-media-api)

---

## Links

- **API**: [api.ilyworks.nl](https://api.ilyworks.nl)
- **npm**: [npmjs.com/package/n8n-nodes-ilyworks](https://www.npmjs.com/package/n8n-nodes-ilyworks)
- **Issues**: [github.com/Linuxifyy/n8n-nodes-ilyworks/issues](https://github.com/Linuxifyy/n8n-nodes-ilyworks/issues)
