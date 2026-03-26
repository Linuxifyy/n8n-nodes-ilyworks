import type { ICredentialType, INodeProperties } from 'n8n-workflow'

export class IlyworksApi implements ICredentialType {
  name = 'ilyworksApi'
  displayName = 'Ilyworks API'
  documentationUrl = 'https://api.ilyworks.nl/#docs'
  icon = 'file:../nodes/Ilyworks/ilyworks.svg'

  properties: INodeProperties[] = [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
      description:
        'Your Ilyworks API key. Get one for free at https://api.ilyworks.nl',
    },
    {
      displayName: 'Base URL',
      name: 'baseUrl',
      type: 'string',
      default: 'https://api.ilyworks.nl',
      description: 'Base URL of the Ilyworks API (change only for self-hosted instances)',
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

  test = {
    request: {
      baseURL: '={{$credentials.baseUrl}}',
      url: '/health',
    },
  }
}
