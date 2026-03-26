import type {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow'
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow'

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
    inputs: [NodeConnectionType.Main],
    outputs: [NodeConnectionType.Main],
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
          { name: 'Video', value: 'video' },
          { name: 'Job', value: 'job' },
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
          {
            name: 'Get Info',
            value: 'info',
            description: 'Get metadata (width, height, format) for an image URL',
            action: 'Get image metadata',
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
            name: 'Transcode',
            value: 'transcode',
            description: 'Convert, resize, or trim a video',
            action: 'Transcode a video',
          },
          {
            name: 'Platform Export',
            value: 'repost',
            description: 'Re-encode a video optimised for TikTok, YouTube, Instagram, Reels, or Twitter',
            action: 'Export video for a platform',
          },
          {
            name: 'Extract Thumbnail',
            value: 'thumbnail',
            description: 'Extract a single frame from a video as an image',
            action: 'Extract a video thumbnail',
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
            name: 'Get Status',
            value: 'status',
            description: 'Poll a video job for its current status and progress',
            action: 'Get job status',
          },
          {
            name: 'Download Result',
            value: 'download',
            description: 'Download the output file of a completed job',
            action: 'Download job result',
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

      // ── Shared: Source URL ────────────────────────────────────────────────
      {
        displayName: 'Image URL',
        name: 'url',
        type: 'string',
        default: '',
        required: true,
        description: 'URL of the source image to transform',
        displayOptions: {
          show: {
            resource: ['image'],
            operation: ['transform', 'info'],
          },
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
          show: {
            resource: ['video'],
            operation: ['transcode', 'repost', 'thumbnail'],
          },
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
          { name: 'WebP (default)', value: 'webp' },
          { name: 'AVIF', value: 'avif' },
          { name: 'JPEG', value: 'jpeg' },
          { name: 'PNG', value: 'png' },
          { name: 'GIF', value: 'gif' },
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
          { name: 'Cover (default)', value: 'cover' },
          { name: 'Contain', value: 'contain' },
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
          { displayName: 'Blur', name: 'blur', type: 'number', default: 0, description: 'Gaussian blur sigma (0.3–1000)' },
          { displayName: 'Sharpen', name: 'sharpen', type: 'number', default: 0, description: 'Sharpen sigma (e.g. 1)' },
          { displayName: 'Grayscale', name: 'grayscale', type: 'boolean', default: false },
          { displayName: 'Sepia', name: 'sepia', type: 'boolean', default: false },
          { displayName: 'Negate', name: 'negate', type: 'boolean', default: false },
          { displayName: 'Flip (vertical)', name: 'flip', type: 'boolean', default: false },
          { displayName: 'Flop (horizontal)', name: 'flop', type: 'boolean', default: false },
          { displayName: 'Rotate (degrees)', name: 'rotate', type: 'number', default: 0 },
          { displayName: 'Brightness (multiplier)', name: 'brightness', type: 'number', default: 1, description: '1 = no change, 0.5 = half, 2 = double' },
          { displayName: 'Contrast (multiplier)', name: 'contrast', type: 'number', default: 1 },
          { displayName: 'Saturation (multiplier)', name: 'saturation', type: 'number', default: 1 },
          { displayName: 'Hue (degrees)', name: 'hue', type: 'number', default: 0 },
          { displayName: 'Tint (hex)', name: 'tint', type: 'string', default: '', description: 'Hex colour e.g. ff6600' },
          { displayName: 'Watermark Text', name: 'watermark', type: 'string', default: '' },
          {
            displayName: 'Watermark Position',
            name: 'watermark_pos',
            type: 'options',
            options: [
              { name: 'Southeast (default)', value: 'southeast' },
              { name: 'Northwest', value: 'northwest' },
              { name: 'North', value: 'north' },
              { name: 'Northeast', value: 'northeast' },
              { name: 'West', value: 'west' },
              { name: 'Center', value: 'center' },
              { name: 'East', value: 'east' },
              { name: 'Southwest', value: 'southwest' },
              { name: 'South', value: 'south' },
            ],
            default: 'southeast',
          },
          { displayName: 'Padding (px)', name: 'pad', type: 'number', default: 0 },
          { displayName: 'Background Color (hex)', name: 'bg', type: 'string', default: '' },
          { displayName: 'Border Width (px)', name: 'border', type: 'number', default: 0 },
          { displayName: 'Border Color (hex)', name: 'border_color', type: 'string', default: '000000' },
          { displayName: 'Corner Radius (px)', name: 'radius', type: 'number', default: 0, description: 'Rounded corners (PNG/WebP only)' },
          { displayName: 'Auto-trim Whitespace', name: 'trim', type: 'boolean', default: false },
        ],
      },
      {
        displayName: 'Return',
        name: 'returnType',
        type: 'options',
        options: [
          { name: 'Binary (image file)', value: 'binary' },
          { name: 'URL string', value: 'url' },
        ],
        default: 'binary',
        description: 'Whether to return the image as binary data or as a URL string',
        displayOptions: {
          show: { resource: ['image'], operation: ['transform'] },
        },
      },

      // ── Video: transcode params ───────────────────────────────────────────
      {
        displayName: 'Output Format',
        name: 'format',
        type: 'options',
        options: [
          { name: 'MP4 (default)', value: 'mp4' },
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
          { displayName: 'Width (px)', name: 'w', type: 'number', default: 0 },
          { displayName: 'Height (px)', name: 'h', type: 'number', default: 0 },
          { displayName: 'Framerate (fps)', name: 'fps', type: 'number', default: 0 },
          { displayName: 'Trim Start (seconds)', name: 'start', type: 'number', default: 0 },
          { displayName: 'Trim End (seconds)', name: 'end', type: 'number', default: 0 },
          { displayName: 'Quality (CRF 0–51, lower = better)', name: 'q', type: 'number', default: 23 },
          { displayName: 'Include Audio', name: 'audio', type: 'boolean', default: true },
          { displayName: 'Strip Metadata', name: 'strip_meta', type: 'boolean', default: true },
        ],
      },

      // ── Video: repost params ──────────────────────────────────────────────
      {
        displayName: 'Platform',
        name: 'platform',
        type: 'options',
        options: [
          { name: 'TikTok (1080×1920, 9:16)', value: 'tiktok' },
          { name: 'Instagram Reels (1080×1920, 9:16)', value: 'reels' },
          { name: 'Instagram (1080×1920, 9:16)', value: 'instagram' },
          { name: 'YouTube (1920×1080, 16:9)', value: 'youtube' },
          { name: 'Twitter (1280×720, 16:9)', value: 'twitter' },
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
          {
            displayName: 'Effect',
            name: 'effect',
            type: 'options',
            options: [
              { name: 'None (default)', value: 'none' },
              { name: 'Grain', value: 'grain' },
              { name: 'Vignette', value: 'vignette' },
              { name: 'Saturation Boost', value: 'saturation_boost' },
            ],
            default: 'none',
          },
          { displayName: 'Watermark Text', name: 'watermark', type: 'string', default: '' },
          { displayName: 'Normalize Audio (–23 LUFS)', name: 'audio_norm', type: 'boolean', default: true },
          { displayName: 'Strip Metadata', name: 'strip_meta', type: 'boolean', default: true },
        ],
      },

      // ── Video: thumbnail params ───────────────────────────────────────────
      {
        displayName: 'Timestamp (seconds)',
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
          { name: 'JPEG (default)', value: 'jpeg' },
          { name: 'PNG', value: 'png' },
          { name: 'WebP', value: 'webp' },
        ],
        default: 'jpeg',
        displayOptions: {
          show: { resource: ['video'], operation: ['thumbnail'] },
        },
      },

      // ── Job: shared jobId ─────────────────────────────────────────────────
      {
        displayName: 'Job ID',
        name: 'jobId',
        type: 'string',
        default: '',
        required: true,
        description: 'The jobId returned by a video operation',
        displayOptions: {
          show: { resource: ['job'] },
        },
      },

      // ── Job: wait options ─────────────────────────────────────────────────
      {
        displayName: 'Poll Interval (seconds)',
        name: 'pollInterval',
        type: 'number',
        default: 3,
        typeOptions: { minValue: 1, maxValue: 30 },
        displayOptions: {
          show: { resource: ['job'], operation: ['wait'] },
        },
      },
      {
        displayName: 'Timeout (seconds)',
        name: 'timeout',
        type: 'number',
        default: 300,
        description: 'Give up and throw an error after this many seconds',
        displayOptions: {
          show: { resource: ['job'], operation: ['wait'] },
        },
      },

      // ── Job download: binary property name ───────────────────────────────
      {
        displayName: 'Output Binary Property',
        name: 'outputBinaryProperty',
        type: 'string',
        default: 'data',
        description: 'Name of the binary property to write the downloaded video into',
        displayOptions: {
          show: { resource: ['job'], operation: ['download'] },
        },
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

            const response = await this.helpers.httpRequestWithAuthentication.call(
              this, 'ilyworksApi',
              {
                method: 'GET',
                url: `${baseUrl}/v1/transform`,
                qs,
                encoding: 'arraybuffer',
                returnFullResponse: true,
              },
            )

            if (returnType === 'url') {
              returnData.push({ json: { transformedUrl: `${baseUrl}/v1/transform?${new URLSearchParams(qs as Record<string, string>)}` } })
            } else {
              const contentType = (response.headers as Record<string, string>)['content-type'] || 'image/webp'
              const ext = contentType.split('/')[1] || 'webp'
              returnData.push({
                json: {},
                binary: {
                  data: await this.helpers.prepareBinaryData(
                    Buffer.from(response.body as Buffer),
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
              {
                method: 'POST',
                url: `${baseUrl}/v1/image/upload`,
                qs,
                body: formData,
              },
            )
            returnData.push({ json: response as object })
          }

          else if (operation === 'info') {
            const url = this.getNodeParameter('url', i) as string
            const response = await this.helpers.httpRequestWithAuthentication.call(
              this, 'ilyworksApi',
              { method: 'GET', url: `${baseUrl}/v1/image/info`, qs: { url } },
            )
            returnData.push({ json: response as object })
          }
        }

        // ── VIDEO ───────────────────────────────────────────────────────────
        else if (resource === 'video') {

          if (operation === 'transcode') {
            const url = this.getNodeParameter('url', i) as string
            const format = this.getNodeParameter('format', i) as string
            const opts = this.getNodeParameter('videoOptions', i) as Record<string, unknown>
            const body: Record<string, unknown> = { url, format, ...stripFalsy(opts) }

            const response = await this.helpers.httpRequestWithAuthentication.call(
              this, 'ilyworksApi',
              { method: 'POST', url: `${baseUrl}/v1/video/transform`, body, json: true },
            )
            returnData.push({ json: response as object })
          }

          else if (operation === 'repost') {
            const url = this.getNodeParameter('url', i) as string
            const platform = this.getNodeParameter('platform', i) as string
            const opts = this.getNodeParameter('repostOptions', i) as Record<string, unknown>
            const body: Record<string, unknown> = { url, platform, ...stripFalsy(opts) }

            const response = await this.helpers.httpRequestWithAuthentication.call(
              this, 'ilyworksApi',
              { method: 'POST', url: `${baseUrl}/v1/video/repost`, body, json: true },
            )
            returnData.push({ json: response as object })
          }

          else if (operation === 'thumbnail') {
            const url = this.getNodeParameter('url', i) as string
            const at = this.getNodeParameter('at', i) as number
            const format = this.getNodeParameter('thumbFormat', i) as string

            const response = await this.helpers.httpRequestWithAuthentication.call(
              this, 'ilyworksApi',
              {
                method: 'POST',
                url: `${baseUrl}/v1/video/thumbnail`,
                qs: { format },
                body: { url, at },
                json: true,
              },
            )
            returnData.push({ json: response as object })
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
            returnData.push({ json: response as object })
          }

          else if (operation === 'download') {
            const outputProp = this.getNodeParameter('outputBinaryProperty', i) as string
            const response = await this.helpers.httpRequestWithAuthentication.call(
              this, 'ilyworksApi',
              {
                method: 'GET',
                url: `${baseUrl}/v1/jobs/${jobId}/download`,
                encoding: 'arraybuffer',
                returnFullResponse: true,
              },
            )
            const contentType = (response.headers as Record<string, string>)['content-type'] || 'video/mp4'
            const ext = contentType === 'video/webm' ? 'webm' : 'mp4'
            returnData.push({
              json: {},
              binary: {
                [outputProp]: await this.helpers.prepareBinaryData(
                  Buffer.from(response.body as Buffer),
                  `ilyworks_${jobId}.${ext}`,
                  contentType,
                ),
              },
            })
          }

          else if (operation === 'wait') {
            const pollInterval = (this.getNodeParameter('pollInterval', i) as number) * 1000
            const timeout = (this.getNodeParameter('timeout', i) as number) * 1000
            const deadline = Date.now() + timeout

            let job: Record<string, unknown> = {}
            while (Date.now() < deadline) {
              job = await this.helpers.httpRequestWithAuthentication.call(
                this, 'ilyworksApi',
                { method: 'GET', url: `${baseUrl}/v1/jobs/${jobId}` },
              ) as Record<string, unknown>

              if (job.status === 'done') break
              if (job.status === 'failed') {
                throw new NodeOperationError(
                  this.getNode(),
                  `Job ${jobId} failed: ${job.error || 'unknown error'}`,
                  { itemIndex: i },
                )
              }
              await sleep(pollInterval)
            }

            if (job.status !== 'done') {
              throw new NodeOperationError(
                this.getNode(),
                `Job ${jobId} did not complete within ${timeout / 1000}s`,
                { itemIndex: i },
              )
            }

            returnData.push({ json: job })
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
  base: Record<string, unknown>,
): Record<string, unknown> {
  const w = ctx.getNodeParameter('w', i) as number
  const h = ctx.getNodeParameter('h', i) as number
  const format = ctx.getNodeParameter('format', i) as string
  const fit = ctx.getNodeParameter('fit', i) as string
  const q = ctx.getNodeParameter('q', i) as number
  const opts = ctx.getNodeParameter('imageOptions', i) as Record<string, unknown>

  const qs: Record<string, unknown> = { ...base, format, fit, q }
  if (w > 0) qs.w = w
  if (h > 0) qs.h = h

  for (const [key, val] of Object.entries(opts)) {
    if (val === 0 || val === false || val === '' || val === 1) continue
    qs[key] = val
  }
  return qs
}

function stripFalsy(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== 0 && v !== false && v !== '' && v !== undefined),
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
