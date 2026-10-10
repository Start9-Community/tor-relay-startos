import { setupManifest } from '@start9labs/start-sdk'
import { long, short } from './i18n'

export const manifest = setupManifest({
  id: 'tor-node',
  title: 'Tor Node',
  license: 'BSD-3-Clause',
  packageRepo: 'https://github.com/alru78/alru78-tor-node-startos',
  upstreamRepo: 'https://gitlab.torproject.org/tpo/core/tor',
  marketingUrl: 'https://community.torproject.org/relay/',
  donationUrl: 'https://donate.torproject.org/',
  description: { short, long },
  volumes: ['main'],
  images: {
    tor: {
      source: { dockerBuild: {} },
      arch: ['x86_64', 'aarch64'],
    },
  },
})
