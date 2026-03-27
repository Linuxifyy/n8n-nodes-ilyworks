import type {
  IDataObject,
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow'
import { NodeConnectionTypes, NodeOperationError, sleep } from 'n8n-workflow'

export class Ilyworks implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Ilyworks',
    name: 'ilyworks',
    icon: 'file:ilyworks.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
    description: 'Transform images and video with the Ilyworks media API',
    defaults: { name: 'Ilyworks' },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'ilyworksApi',
        required: true,
      },
    ],

    properties: [
      // ── Resource ────────────────────────────────────────────────────────
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          { name: 'Image', value: 'image' },
          { name: 'Job', value: 'job' },
          { name: 'Sign', value: 'sign' },
          { name: 'Video', value: 'video' },
        ],
        default: 'image',
      },

      // ── Image operations ─────────────────────────────────────────────────
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['image'] } },
        options: [
          {
            name: 'Convert PDF',
            value: 'convertPdf',
            description: 'Convert a PDF page to an image',
            action: 'Convert a PDF to an image',
          },
          {
            name: 'Get Info',
            value: 'info',
            description: 'Get metadata (width, height, format) for an image URL',
            action: 'Get image metadata',
          },
          {
            name: 'Placeholder',
            value: 'placeholder',
            description: 'Generate a placeholder from an image URL',
            action: 'Generate an image placeholder',
          },
          {
            name: 'Transform (URL Path)',
            value: 'transformPath',
            description: 'Apply transforms via URL path and return the resulting image',
            action: 'Transform an image via URL path',
          },
          {
            name: 'Transform URL',
            value: 'transform',
            description: 'Fetch, transform, and cache an image from a URL',
            action: 'Transform an image from a URL',
          },
          {
            name: 'Upload & Transform',
            value: 'upload',
            description: 'Upload a binary image and apply transformations',
            action: 'Upload and transform an image',
          },
        ],
        default: 'transform',
      },

      // ── Video operations ──────────────────────────────────────────────────
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['video'] } },
        options: [
          {
            name: 'Extract Thumbnail',
            value: 'thumbnail',
            description: 'Extract a single frame from a video as an image',
            action: 'Extract a video thumbnail',
          },
          {
            name: 'Platform Export',
            value: 'repost',
            description: 'Re-encode a video optimised for TikTok, YouTube, Instagram, Reels, or Twitter',
            action: 'Export video for a platform',
          },
          {
            name: 'Sprite Sheet',
            value: 'sprite',
            description: 'Generate a sprite sheet of frames from a video',
            action: 'Generate a video sprite sheet',
          },
          {
            name: 'Transcode',
            value: 'transcode',
            description: 'Convert, resize, or trim a video',
            action: 'Transcode a video',
          },
        ],
        default: 'transcode',
      },

      // ── Job operations ────────────────────────────────────────────────────
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['job'] } },
        options: [
          {
            name: 'Download Result',
            value: 'download',
            description: 'Download the output file of a completed job as binary',
            action: 'Download job result',
          },
          {
            name: 'Get Status',
            value: 'status',
            description: 'Poll a video job for its current status and progress',
            action: 'Get job status',
          },
          {
            name: 'Wait Until Done',
            value: 'wait',
            description: 'Poll a job every N seconds until it completes or fails',
            action: 'Wait for job to complete',
          },
        ],
        default: 'status',
      },

      // ── Sign operations ───────────────────────────────────────────────────
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['sign'] } },
        options: [
          {
            name: 'Sign URL',
            value: 'signUrl',
            description: 'Sign a transform URL so it can be used without an API key',
            action: 'Sign a URL',
          },
        ],
        default: 'signUrl',
      },

      // ── Shared: Source URL ────────────────────────────────────────────────
      {
        displayName: 'Image URL',
        name: 'url',
        type: 'string',
        default: '',
        required: true,
        description: 'URL of the source image to transform',
        displayOptions: {
          show: { resource: ['image'], operation: ['transform', 'info', 'placeholder'] },
        },
      },
      {
        displayName: 'Video URL',
        name: 'url',
        type: 'string',
        default: '',
        required: true,
        description: 'URL of the source video',
        displayOptions: {
          show: { resource: ['video'], operation: ['transcode', 'repost', 'thumbnail', 'sprite'] },
        },
      },

      // ── Image upload: binary field ────────────────────────────────────────
      {
        displayName: 'Binary Property',
        name: 'binaryProperty',
        type: 'string',
        default: 'data',
        required: true,
        description: 'Name of the binary property containing the image file',
        displayOptions: {
          show: { resource: ['image'], operation: ['upload'] },
        },
      },

      // ── Image transform params ────────────────────────────────────────────
      {
        displayName: 'Width',
        name: 'w',
        type: 'number',
        default: 0,
        description: 'Output width in pixels (0 = keep original)',
        displayOptions: {
          show: { resource: ['image'], operation: ['transform', 'upload'] },
        },
      },
      {
        displayName: 'Height',
        name: 'h',
        type: 'number',
        default: 0,
        description: 'Output height in pixels (0 = keep original)',
        displayOptions: {
          show: { resource: ['image'], operation: ['transform', 'upload'] },
        },
      },
      {
        displayName: 'Format',
        name: 'format',
        type: 'options',
        options: [
          { name: 'AVIF', value: 'avif' },
          { name: 'GIF', value: 'gif' },
          { name: 'JPEG', value: 'jpeg' },
          { name: 'PNG', value: 'png' },
          { name: 'WebP (Default)', value: 'webp' },
        ],
        default: 'webp',
        displayOptions: {
          show: { resource: ['image'], operation: ['transform', 'upload'] },
        },
      },
      {
        displayName: 'Fit',
        name: 'fit',
        type: 'options',
        options: [
          { name: 'Attention (Smart Crop)', value: 'attention' },
          { name: 'Contain', value: 'contain' },
          { name: 'Cover (Default)', value: 'cover' },
          { name: 'Entropy (Smart Crop)', value: 'entropy' },
          { name: 'Fill', value: 'fill' },
          { name: 'Inside', value: 'inside' },
          { name: 'Outside', value: 'outside' },
        ],
        default: 'cover',
        displayOptions: {
          show: { resource: ['image'], operation: ['transform', 'upload'] },
        },
      },
      {
        displayName: 'Quality',
        name: 'q',
        type: 'number',
        typeOptions: { minValue: 1, maxValue: 100 },
        default: 80,
        description: 'Output quality (1–100)',
        displayOptions: {
          show: { resource: ['image'], operation: ['transform', 'upload'] },
        },
      },
      {
        displayName: 'Additional Options',
        name: 'imageOptions',
        type: 'collection',
        placeholder: 'Add option',
        default: {},
        displayOptions: {
          show: { resource: ['image'], operation: ['transform', 'upload'] },
        },
        options: [
          { displayName: 'Auto-Trim Whitespace', name: 'trim', type: 'boolean', default: false },
          { displayName: 'Background Color (Hex)', name: 'bg', type: 'string', default: '' },
          { displayName: 'Blur', name: 'blur', type: 'number', default: 0, description: 'Gaussian blur sigma (0.3–1000)' },
          { displayName: 'Border Color (Hex)', name: 'border_color', type: 'color', default: '' },
          { displayName: 'Border Width (Px)', name: 'border', type: 'number', default: 0 },
          { displayName: 'Brightness', name: 'brightness', type: 'number', default: 1, description: '1 = no change' },
          { displayName: 'Contrast', name: 'contrast', type: 'number', default: 1 },
          { displayName: 'Corner Radius (Px)', name: 'radius', type: 'number', default: 0, description: 'PNG/WebP only' },
          { displayName: 'Flip (Vertical)', name: 'flip', type: 'boolean', default: false },
          { displayName: 'Flop (Horizontal)', name: 'flop', type: 'boolean', default: false },
          { displayName: 'Grayscale', name: 'grayscale', type: 'boolean', default: false },
          { displayName: 'Hue (Degrees)', name: 'hue', type: 'number', default: 0 },
          { displayName: 'Negate', name: 'negate', type: 'boolean', default: false },
          { displayName: 'Padding (Px)', name: 'pad', type: 'number', default: 0 },
          { displayName: 'Rotate (Degrees)', name: 'rotate', type: 'number', default: 0 },
          { displayName: 'Saturation', name: 'saturation', type: 'number', default: 1 },
          { displayName: 'Sepia', name: 'sepia', type: 'boolean', default: false },
          { displayName: 'Sharpen', name: 'sharpen', type: 'number', default: 0 },
          { displayName: 'Tint (Hex)', name: 'tint', type: 'string', default: '' },
          {
            displayName: 'Watermark Position',
            name: 'watermark_pos',
            type: 'options',
            options: [
              { name: 'Center', value: 'center' },
              { name: 'East', value: 'east' },
              { name: 'North', value: 'north' },
              { name: 'Northeast', value: 'northeast' },
              { name: 'Northwest', value: 'northwest' },
              { name: 'South', value: 'south' },
              { name: 'Southeast (Default)', value: 'southeast' },
              { name: 'Southwest', value: 'southwest' },
              { name: 'West', value: 'west' },
            ],
            default: 'southeast',
          },
          { displayName: 'Watermark Text', name: 'watermark', type: 'string', default: '' },
        ],
      },
      {
        displayName: 'Return As',
        name: 'returnType',
        type: 'options',
        options: [
          { name: 'Binary (Image File)', value: 'binary' },
          { name: 'URL String', value: 'url' },
        ],
        default: 'binary',
        displayOptions: {
          show: { resource: ['image'], operation: ['transform'] },
        },
      },

      // ── Image: placeholder params ─────────────────────────────────────────
      {
        displayName: 'Type',
        name: 'placeholderType',
        type: 'options',
        options: [
          { name: 'Data URL', value: 'dataurl' },
          { name: 'Dominant Color', value: 'color' },
          { name: 'SVG', value: 'svg' },
        ],
        default: 'dataurl',
        displayOptions: {
          show: { resource: ['image'], operation: ['placeholder'] },
        },
      },

      // ── Image: convert PDF params ─────────────────────────────────────────
      {
        displayName: 'PDF URL',
        name: 'pdfUrl',
        type: 'string',
        default: '',
        description: 'URL of the PDF to convert (leave empty to use binary input)',
        displayOptions: {
          show: { resource: ['image'], operation: ['convertPdf'] },
        },
      },
      {
        displayName: 'Binary Property',
        name: 'pdfBinaryProperty',
        type: 'string',
        default: 'data',
        description: 'Name of the binary property containing the PDF file (used when PDF URL is empty)',
        displayOptions: {
          show: { resource: ['image'], operation: ['convertPdf'] },
        },
      },
      {
        displayName: 'PDF Options',
        name: 'pdfOptions',
        type: 'collection',
        placeholder: 'Add option',
        default: {},
        displayOptions: {
          show: { resource: ['image'], operation: ['convertPdf'] },
        },
        options: [
          {
            displayName: 'Density (DPI)',
            name: 'density',
            type: 'number',
            typeOptions: { minValue: 72, maxValue: 300 },
            default: 72,
            description: 'Render density in DPI (72–300)',
          },
          {
            displayName: 'Format',
            name: 'format',
            type: 'options',
            options: [
              { name: 'JPEG', value: 'jpeg' },
              { name: 'PNG', value: 'png' },
              { name: 'WebP', value: 'webp' },
            ],
            default: 'jpeg',
          },
          {
            displayName: 'Page',
            name: 'page',
            type: 'number',
            default: 0,
            description: 'Zero-based page index to render',
          },
          {
            displayName: 'Quality',
            name: 'quality',
            type: 'number',
            typeOptions: { minValue: 1, maxValue: 100 },
            default: 80,
            description: 'Output quality (1–100)',
          },
          {
            displayName: 'Width (Px)',
            name: 'width',
            type: 'number',
            default: 0,
            description: 'Output width in pixels (0 = keep original)',
          },
        ],
      },

      // ── Image: transform path params ──────────────────────────────────────
      {
        displayName: 'Source URL',
        name: 'sourceUrl',
        type: 'string',
        default: '',
        required: true,
        description: 'URL of the source image',
        displayOptions: {
          show: { resource: ['image'], operation: ['transformPath'] },
        },
      },
      {
        displayName: 'Transforms',
        name: 'transforms',
        type: 'string',
        default: '',
        required: true,
        description: 'Comma-separated transform string, e.g. "w_400,f_webp,q_80"',
        displayOptions: {
          show: { resource: ['image'], operation: ['transformPath'] },
        },
      },

      // ── Video: transcode params ───────────────────────────────────────────
      {
        displayName: 'Output Format',
        name: 'format',
        type: 'options',
        options: [
          { name: 'MP4 (Default)', value: 'mp4' },
          { name: 'WebM', value: 'webm' },
        ],
        default: 'mp4',
        displayOptions: {
          show: { resource: ['video'], operation: ['transcode'] },
        },
      },
      {
        displayName: 'Video Options',
        name: 'videoOptions',
        type: 'collection',
        placeholder: 'Add option',
        default: {},
        displayOptions: {
          show: { resource: ['video'], operation: ['transcode'] },
        },
        options: [
          { displayName: 'Callback URL', name: 'callbackUrl', type: 'string', default: '', description: 'Webhook URL to call when the job completes' },
          { displayName: 'Framerate (Fps)', name: 'fps', type: 'number', default: 0 },
          { displayName: 'Height (Px)', name: 'h', type: 'number', default: 0 },
          { displayName: 'Include Audio', name: 'audio', type: 'boolean', default: true },
          { displayName: 'Quality CRF (0–51, Lower = Better)', name: 'q', type: 'number', default: 23 },
          { displayName: 'Strip Metadata', name: 'strip_meta', type: 'boolean', default: true },
          { displayName: 'Trim End (Seconds)', name: 'end', type: 'number', default: 0 },
          { displayName: 'Trim Start (Seconds)', name: 'start', type: 'number', default: 0 },
          { displayName: 'Width (Px)', name: 'w', type: 'number', default: 0 },
        ],
      },

      // ── Video: repost params ──────────────────────────────────────────────
      {
        displayName: 'Platform',
        name: 'platform',
        type: 'options',
        options: [
          { name: 'Instagram — 1080×1920 (9:16)', value: 'instagram' },
          { name: 'Instagram Reels — 1080×1920 (9:16)', value: 'reels' },
          { name: 'TikTok — 1080×1920 (9:16)', value: 'tiktok' },
          { name: 'Twitter — 1280×720 (16:9)', value: 'twitter' },
          { name: 'YouTube — 1920×1080 (16:9)', value: 'youtube' },
        ],
        default: 'tiktok',
        required: true,
        displayOptions: {
          show: { resource: ['video'], operation: ['repost'] },
        },
      },
      {
        displayName: 'Repost Options',
        name: 'repostOptions',
        type: 'collection',
        placeholder: 'Add option',
        default: {},
        displayOptions: {
          show: { resource: ['video'], operation: ['repost'] },
        },
        options: [
          { displayName: 'Callback URL', name: 'callbackUrl', type: 'string', default: '', description: 'Webhook URL to call when the job completes' },
          {
            displayName: 'Effect',
            name: 'effect',
            type: 'options',
            options: [
              { name: 'Grain', value: 'grain' },
              { name: 'None', value: 'none' },
              { name: 'Saturation Boost', value: 'saturation_boost' },
              { name: 'Vignette', value: 'vignette' },
            ],
            default: 'none',
          },
          { displayName: 'Normalize Audio (–23 LUFS)', name: 'audio_norm', type: 'boolean', default: true },
          { displayName: 'Strip Metadata', name: 'strip_meta', type: 'boolean', default: true },
          { displayName: 'Watermark Text', name: 'watermark', type: 'string', default: '' },
        ],
      },

      // ── Video: thumbnail params ───────────────────────────────────────────
      {
        displayName: 'Timestamp (Seconds)',
        name: 'at',
        type: 'number',
        default: 0,
        description: 'Extract frame at this point in the video',
        displayOptions: {
          show: { resource: ['video'], operation: ['thumbnail'] },
        },
      },
      {
        displayName: 'Thumbnail Format',
        name: 'thumbFormat',
        type: 'options',
        options: [
          { name: 'JPEG (Default)', value: 'jpeg' },
          { name: 'PNG', value: 'png' },
          { name: 'WebP', value: 'webp' },
        ],
        default: 'jpeg',
        displayOptions: {
          show: { resource: ['video'], operation: ['thumbnail'] },
        },
      },

      // ── Video: sprite sheet params ────────────────────────────────────────
      {
        displayName: 'Sprite Options',
        name: 'spriteOptions',
        type: 'collection',
        placeholder: 'Add option',
        default: {},
        displayOptions: {
          show: { resource: ['video'], operation: ['sprite'] },
        },
        options: [
          { displayName: 'Columns', name: 'cols', type: 'number', default: 4, description: 'Number of columns in the sprite sheet' },
          { displayName: 'Frame Count', name: 'count', type: 'number', default: 12, description: 'Total number of frames to capture' },
          { displayName: 'Frame Width (Px)', name: 'width', type: 'number', default: 160, description: 'Width of each frame in pixels' },
        ],
      },

      // ── Job params ────────────────────────────────────────────────────────
      {
        displayName: 'Job ID',
        name: 'jobId',
        type: 'string',
        default: '',
        required: true,
        description: 'The jobId returned by a video submit operation',
        displayOptions: { show: { resource: ['job'] } },
      },
      {
        displayName: 'Poll Interval (Seconds)',
        name: 'pollInterval',
        type: 'number',
        default: 3,
        typeOptions: { minValue: 1, maxValue: 30 },
        displayOptions: { show: { resource: ['job'], operation: ['wait'] } },
      },
      {
        displayName: 'Timeout (Seconds)',
        name: 'timeout',
        type: 'number',
        default: 300,
        description: 'Throw an error if job does not complete within this time',
        displayOptions: { show: { resource: ['job'], operation: ['wait'] } },
      },
      {
        displayName: 'Output Binary Property',
        name: 'outputBinaryProperty',
        type: 'string',
        default: 'data',
        description: 'Binary property name to write the downloaded video into',
        displayOptions: { show: { resource: ['job'], operation: ['download'] } },
      },

      // ── Sign: sign URL params ─────────────────────────────────────────────
      {
        displayName: 'URL to Sign',
        name: 'signUrl',
        type: 'string',
        default: '',
        required: true,
        description: 'The transform URL to sign',
        displayOptions: { show: { resource: ['sign'], operation: ['signUrl'] } },
      },
      {
        displayName: 'TTL (Seconds)',
        name: 'ttl',
        type: 'number',
        default: 3600,
        description: 'How long the signed URL should remain valid',
        displayOptions: { show: { resource: ['sign'], operation: ['signUrl'] } },
      },
    ],
  }

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData()
    const credentials = await this.getCredentials('ilyworksApi')
    const baseUrl = (credentials.baseUrl as string).replace(/\/$/, '')
    const returnData: INodeExecutionData[] = []

    for (let i = 0; i < items.length; i++) {
      const resource = this.getNodeParameter('resource', i) as string
      const operation = this.getNodeParameter('operation', i) as string

      try {
        // ── IMAGE ───────────────────────────────────────────────────────────
        if (resource === 'image') {

          if (operation === 'transform') {
            const url = this.getNodeParameter('url', i) as string
            const returnType = this.getNodeParameter('returnType', i) as string
            const qs = buildImageQs(this, i, { url })

            if (returnType === 'url') {
              const transformedUrl = `${baseUrl}/v1/transform?${new URLSearchParams(qs as Record<string, string>)}`
              returnData.push({ json: { transformedUrl } })
            } else {
              const response = await this.helpers.httpRequestWithAuthentication.call(
                this, 'ilyworksApi',
                { method: 'GET', url: `${baseUrl}/v1/transform`, qs, encoding: 'arraybuffer', returnFullResponse: true },
              ) as { body: Buffer; headers: Record<string, string> }

              const contentType = response.headers['content-type'] || 'image/webp'
              const ext = contentType.split('/')[1]?.split(';')[0] || 'webp'
              returnData.push({
                json: {},
                binary: {
                  data: await this.helpers.prepareBinaryData(
                    Buffer.from(response.body),
                    `transformed.${ext}`,
                    contentType,
                  ),
                },
              })
            }
          }

          else if (operation === 'upload') {
            const binaryProp = this.getNodeParameter('binaryProperty', i) as string
            const binaryData = this.helpers.assertBinaryData(i, binaryProp)
            const buffer = await this.helpers.getBinaryDataBuffer(i, binaryProp)
            const qs = buildImageQs(this, i, {})

            const formData = new FormData()
            formData.append('file', new Blob([buffer], { type: binaryData.mimeType }), binaryData.fileName || 'upload')

            const response = await this.helpers.httpRequestWithAuthentication.call(
              this, 'ilyworksApi',
              { method: 'POST', url: `${baseUrl}/v1/image/upload`, qs, body: formData },
            )
            returnData.push({ json: response as IDataObject })
          }

          else if (operation === 'info') {
            const url = this.getNodeParameter('url', i) as string
            const response = await this.helpers.httpRequestWithAuthentication.call(
              this, 'ilyworksApi',
              { method: 'GET', url: `${baseUrl}/v1/image/info`, qs: { url } },
            )
            returnData.push({ json: response as IDataObject })
          }

          else if (operation === 'placeholder') {
            const url = this.getNodeParameter('url', i) as string
            const type = this.getNodeParameter('placeholderType', i) as string
            const response = await this.helpers.httpRequestWithAuthentication.call(
              this, 'ilyworksApi',
              { method: 'GET', url: `${baseUrl}/v1/image/placeholder`, qs: { url, type } },
            )
            returnData.push({ json: response as IDataObject })
          }

          else if (operation === 'convertPdf') {
            const pdfUrl = this.getNodeParameter('pdfUrl', i) as string
            const opts = this.getNodeParameter('pdfOptions', i) as IDataObject
            const body: IDataObject = { ...stripFalsy(opts) }

            if (pdfUrl) {
              body.url = pdfUrl

              const response = await this.helpers.httpRequestWithAuthentication.call(
                this, 'ilyworksApi',
                { method: 'POST', url: `${baseUrl}/v1/pdf/convert`, body, json: true, encoding: 'arraybuffer', returnFullResponse: true },
              ) as { body: Buffer; headers: Record<string, string> }

              const contentType = response.headers['content-type'] || 'image/jpeg'
              const ext = contentType.split('/')[1]?.split(';')[0] || 'jpeg'
              returnData.push({
                json: {},
                binary: {
                  data: await this.helpers.prepareBinaryData(
                    Buffer.from(response.body),
                    `pdf_page.${ext}`,
                    contentType,
                  ),
                },
              })
            } else {
              const binaryProp = this.getNodeParameter('pdfBinaryProperty', i) as string
              const binaryData = this.helpers.assertBinaryData(i, binaryProp)
              const buffer = await this.helpers.getBinaryDataBuffer(i, binaryProp)

              const formData = new FormData()
              formData.append('file', new Blob([buffer], { type: binaryData.mimeType || 'application/pdf' }), binaryData.fileName || 'upload.pdf')
              for (const [key, val] of Object.entries(body)) {
                formData.append(key, String(val))
              }

              const response = await this.helpers.httpRequestWithAuthentication.call(
                this, 'ilyworksApi',
                { method: 'POST', url: `${baseUrl}/v1/pdf/convert`, body: formData, encoding: 'arraybuffer', returnFullResponse: true },
              ) as { body: Buffer; headers: Record<string, string> }

              const contentType = response.headers['content-type'] || 'image/jpeg'
              const ext = contentType.split('/')[1]?.split(';')[0] || 'jpeg'
              returnData.push({
                json: {},
                binary: {
                  data: await this.helpers.prepareBinaryData(
                    Buffer.from(response.body),
                    `pdf_page.${ext}`,
                    contentType,
                  ),
                },
              })
            }
          }

          else if (operation === 'transformPath') {
            const sourceUrl = this.getNodeParameter('sourceUrl', i) as string
            const transforms = this.getNodeParameter('transforms', i) as string

            const response = await this.helpers.httpRequestWithAuthentication.call(
              this, 'ilyworksApi',
              { method: 'GET', url: `${baseUrl}/v1/t/${transforms}/${encodeURIComponent(sourceUrl)}`, encoding: 'arraybuffer', returnFullResponse: true },
            ) as { body: Buffer; headers: Record<string, string> }

            const contentType = response.headers['content-type'] || 'image/webp'
            const ext = contentType.split('/')[1]?.split(';')[0] || 'webp'
            returnData.push({
              json: {},
              binary: {
                data: await this.helpers.prepareBinaryData(
                  Buffer.from(response.body),
                  `transformed.${ext}`,
                  contentType,
                ),
              },
            })
          }
        }

        // ── VIDEO ───────────────────────────────────────────────────────────
        else if (resource === 'video') {

          if (operation === 'transcode') {
            const url = this.getNodeParameter('url', i) as string
            const format = this.getNodeParameter('format', i) as string
            const opts = this.getNodeParameter('videoOptions', i) as IDataObject
            const { callbackUrl, ...restOpts } = opts
            const body: IDataObject = { url, format, ...stripFalsy(restOpts as IDataObject) }
            if (callbackUrl) body.callbackUrl = callbackUrl

            const response = await this.helpers.httpRequestWithAuthentication.call(
              this, 'ilyworksApi',
              { method: 'POST', url: `${baseUrl}/v1/video/transform`, body, json: true },
            )
            returnData.push({ json: response as IDataObject })
          }

          else if (operation === 'repost') {
            const url = this.getNodeParameter('url', i) as string
            const platform = this.getNodeParameter('platform', i) as string
            const opts = this.getNodeParameter('repostOptions', i) as IDataObject
            const { callbackUrl, ...restOpts } = opts
            const body: IDataObject = { url, platform, ...stripFalsy(restOpts as IDataObject) }
            if (callbackUrl) body.callbackUrl = callbackUrl

            const response = await this.helpers.httpRequestWithAuthentication.call(
              this, 'ilyworksApi',
              { method: 'POST', url: `${baseUrl}/v1/video/repost`, body, json: true },
            )
            returnData.push({ json: response as IDataObject })
          }

          else if (operation === 'thumbnail') {
            const url = this.getNodeParameter('url', i) as string
            const at = this.getNodeParameter('at', i) as number
            const format = this.getNodeParameter('thumbFormat', i) as string

            const response = await this.helpers.httpRequestWithAuthentication.call(
              this, 'ilyworksApi',
              { method: 'POST', url: `${baseUrl}/v1/video/thumbnail`, qs: { format }, body: { url, at }, json: true },
            )
            returnData.push({ json: response as IDataObject })
          }

          else if (operation === 'sprite') {
            const url = this.getNodeParameter('url', i) as string
            const opts = this.getNodeParameter('spriteOptions', i) as IDataObject
            const body: IDataObject = { url, ...stripFalsy(opts) }

            const response = await this.helpers.httpRequestWithAuthentication.call(
              this, 'ilyworksApi',
              { method: 'POST', url: `${baseUrl}/v1/video/sprite`, body, json: true },
            )
            returnData.push({ json: response as IDataObject })
          }
        }

        // ── JOB ─────────────────────────────────────────────────────────────
        else if (resource === 'job') {
          const jobId = this.getNodeParameter('jobId', i) as string

          if (operation === 'status') {
            const response = await this.helpers.httpRequestWithAuthentication.call(
              this, 'ilyworksApi',
              { method: 'GET', url: `${baseUrl}/v1/jobs/${jobId}` },
            )
            returnData.push({ json: response as IDataObject })
          }

          else if (operation === 'download') {
            const outputProp = this.getNodeParameter('outputBinaryProperty', i) as string

            const response = await this.helpers.httpRequestWithAuthentication.call(
              this, 'ilyworksApi',
              { method: 'GET', url: `${baseUrl}/v1/jobs/${jobId}/download`, encoding: 'arraybuffer', returnFullResponse: true },
            ) as { body: Buffer; headers: Record<string, string> }

            const contentType = response.headers['content-type'] || 'video/mp4'
            const ext = contentType === 'video/webm' ? 'webm' : 'mp4'
            returnData.push({
              json: {},
              binary: {
                [outputProp]: await this.helpers.prepareBinaryData(
                  Buffer.from(response.body),
                  `ilyworks_${jobId}.${ext}`,
                  contentType,
                ),
              },
            })
          }

          else if (operation === 'wait') {
            const pollIntervalMs = (this.getNodeParameter('pollInterval', i) as number) * 1000
            const timeoutMs = (this.getNodeParameter('timeout', i) as number) * 1000
            const deadline = Date.now() + timeoutMs

            let job: IDataObject = {}
            while (Date.now() < deadline) {
              job = await this.helpers.httpRequestWithAuthentication.call(
                this, 'ilyworksApi',
                { method: 'GET', url: `${baseUrl}/v1/jobs/${jobId}` },
              ) as IDataObject

              if (job.status === 'done') break
              if (job.status === 'failed') {
                throw new NodeOperationError(
                  this.getNode(),
                  `Job ${jobId} failed: ${String(job.error ?? 'unknown error')}`,
                  { itemIndex: i },
                )
              }
              await sleep(pollIntervalMs)
            }

            if (job.status !== 'done') {
              throw new NodeOperationError(
                this.getNode(),
                `Job ${jobId} did not complete within ${timeoutMs / 1000}s`,
                { itemIndex: i },
              )
            }

            returnData.push({ json: job })
          }
        }

        // ── SIGN ─────────────────────────────────────────────────────────────
        else if (resource === 'sign') {

          if (operation === 'signUrl') {
            const url = this.getNodeParameter('signUrl', i) as string
            const ttl = this.getNodeParameter('ttl', i) as number
            const response = await this.helpers.httpRequestWithAuthentication.call(
              this, 'ilyworksApi',
              { method: 'POST', url: `${baseUrl}/v1/sign`, body: { url, ttl }, json: true },
            )
            returnData.push({ json: response as IDataObject })
          }
        }

      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({ json: { error: (error as Error).message }, pairedItem: i })
          continue
        }
        throw error
      }
    }

    return [returnData]
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function buildImageQs(
  ctx: IExecuteFunctions,
  i: number,
  base: IDataObject,
): IDataObject {
  const w = ctx.getNodeParameter('w', i) as number
  const h = ctx.getNodeParameter('h', i) as number
  const format = ctx.getNodeParameter('format', i) as string
  const fit = ctx.getNodeParameter('fit', i) as string
  const q = ctx.getNodeParameter('q', i) as number
  const opts = ctx.getNodeParameter('imageOptions', i) as IDataObject

  const qs: IDataObject = { ...base, format, fit, q }
  if (w > 0) qs.w = w
  if (h > 0) qs.h = h

  for (const [key, val] of Object.entries(opts)) {
    if (val === 0 || val === false || val === '' || val === 1) continue
    qs[key] = val
  }
  return qs
}

function stripFalsy(obj: IDataObject): IDataObject {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== 0 && v !== false && v !== '' && v !== undefined),
  )
}
