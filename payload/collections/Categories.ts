import type { CollectionConfig } from 'payload'

export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: {
    useAsTitle: 'name',
    group: 'İçerik',
    defaultColumns: ['name', 'icon', 'color', 'slug'],
  },
  timestamps: true,
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      localized: true,
    },
    {
      name: 'icon',
      type: 'text',
      admin: {
        description: 'Material Symbols icon name (e.g. "favorite", "volunteer_activism")',
      },
    },
    {
      name: 'color',
      type: 'text',
      admin: {
        description: 'Hex color code (e.g. #10B981)',
      },
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
            if (!data?.slug && data?.name) {
              const name = typeof data.name === 'string' ? data.name : data.name?.tr
              return name
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
  ],
}
