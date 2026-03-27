import type { ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow'

export class IlyworksApi implements ICredentialType {
  name = 'ilyworksApi'
  displayName = 'Ilyworks API'
  documentationUrl = 'https://api.ilyworks.nl/#docs'

  properties: INodeProperties[] = [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
      description: 'Your Ilyworks API key. Get one for free at https://api.ilyworks.nl.',
    },
    {
      displayName: 'Base URL',
      name: 'baseUrl',
      type: 'string',
      default: 'https://api.ilyworks.nl',
      description: 'Base URL of the Ilyworks API. Only change this if you self-host.',
    },
  ]

  authenticate = {
    type: 'generic' as const,
    properties: {
      headers: {
        'X-API-Key': '={{$credentials.apiKey}}',
      },
    },
  }

  test: ICredentialTestRequest = {
    request: {
      baseURL: '={{$credentials.baseUrl}}',
      url: '/v1/image/info',
      qs: {
        url: 'https://picsum.photos/50',
      },
    },
  }
}
