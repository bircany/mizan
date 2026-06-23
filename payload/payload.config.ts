import { buildConfig } from 'payload'
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { seoPlugin } from '@payloadcms/plugin-seo'

import { Campaigns } from './collections/Campaigns'
import { News } from './collections/News'
import { Categories } from './collections/Categories'
import { Donations } from './collections/Donations'
import { Pages } from './collections/Pages'

const databaseAdapter = () => {
  const uri = process.env.PAYLOAD_DATABASE_URI || ''

  if (process.env.PAYLOAD_DATABASE_ADAPTER === 'postgres') {
    return postgresAdapter({ url: uri })
  }

  return mongooseAdapter({ url: uri })
}

export default buildConfig({
  admin: {
    user: {
      slug: 'users',
    },
    meta: {
      titleSuffix: ' - Mizan Derneği',
      favicon: '/favicon.ico',
      ogImage: '/og-image.png',
    },
    components: {
      graphics: {
        Logo: {
          path: '/payload/admin/Logo.tsx',
        },
        Icon: {
          path: '/payload/admin/Icon.tsx',
        },
      },
    },
    datePicker: {
      displayFormat: 'd MMM yyyy',
    },
  },

  collections: [Campaigns, News, Categories, Donations, Pages],

  editor: lexicalEditor(),

  localization: {
    locales: ['tr', 'en', 'ar'],
    defaultLocale: 'tr',
    fallback: true,
  },

  db: databaseAdapter(),

  graphQL: {
    disable: false,
  },

  rateLimit: {
    max: 100,
    window: 60 * 1000,
  },

  plugins: [
    seoPlugin({
      collections: ['campaigns', 'news', 'pages'],
      uploadsCollection: 'media',
      generateTitle: ({ doc }: any) => `${doc.title?.tr || doc.title} - Mizan Derneği`,
    }),
  ],
})
