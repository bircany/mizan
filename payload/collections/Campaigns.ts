import type { CollectionConfig } from 'payload'

export const Campaigns: CollectionConfig = {
  slug: 'campaigns',
  admin: {
    useAsTitle: 'title',
    group: 'İçerik',
    defaultColumns: ['title', 'target_amount', 'collected_amount', 'is_active', 'category'],
    listSearchableFields: ['title', 'description'],
  },
  timestamps: true,
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
    },
    {
      name: 'description',
      type: 'richText',
      localized: true,
    },
    {
      name: 'target_amount',
      type: 'number',
      required: true,
      min: 0,
    },
    {
      name: 'collected_amount',
      type: 'number',
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
    },
    {
      name: 'is_active',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        position: 'sidebar',
      },
      hooks: {
        beforeValidate: [
          ({ data }: any) => {
            if (!data?.slug && data?.title) {
              const title = typeof data.title === 'string' ? data.title : data.title?.tr
              return title
                ?.toLowerCase()
                .replace(/[^a-z0-9\u00C0-\u024F\s-]/g, '')
                .trim()
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
            }
            return data?.slug
          },
        ],
      },
    },
    {
      name: 'donor_count',
      type: 'number',
      defaultValue: 0,
      min: 0,
      admin: {
        readOnly: true,
      },
    },
  ],
}
