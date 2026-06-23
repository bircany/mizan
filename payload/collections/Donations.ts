import type { CollectionConfig } from 'payload'

export const Donations: CollectionConfig = {
  slug: 'donations',
  admin: {
    useAsTitle: 'donor_name',
    group: 'Bağışlar',
    defaultColumns: ['donor_name', 'amount', 'currency', 'status', 'campaign', 'createdAt'],
    listSearchableFields: ['donor_name', 'email', 'receipt_number'],
  },
  timestamps: true,
  fields: [
    {
      name: 'donor_name',
      type: 'text',
      required: true,
    },
    {
      name: 'email',
      type: 'email',
      required: true,
    },
    {
      name: 'phone',
      type: 'text',
    },
    {
      name: 'campaign',
      type: 'relationship',
      relationTo: 'campaigns',
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
      min: 1,
    },
    {
      name: 'currency',
      type: 'select',
      options: [
        { label: '₺ TRY', value: 'TRY' },
        { label: '$ USD', value: 'USD' },
        { label: '€ EUR', value: 'EUR' },
      ],
      defaultValue: 'TRY',
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Beklemede', value: 'pending' },
        { label: 'Tamamlandı', value: 'completed' },
        { label: 'Başarısız', value: 'failed' },
        { label: 'İade Edildi', value: 'refunded' },
      ],
      defaultValue: 'pending',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'receipt_number',
      type: 'text',
      unique: true,
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
      hooks: {
        beforeValidate: [
          ({ data, operation }: any) => {
            if (operation === 'create' && !data?.receipt_number) {
              const timestamp = Date.now().toString(36).toUpperCase()
              const random = Math.random().toString(36).substring(2, 6).toUpperCase()
              return `MIZ-${timestamp}-${random}`
            }
            return data?.receipt_number
          },
        ],
      },
    },
    {
      name: 'donation_note',
      type: 'textarea',
      maxLength: 500,
    },
    {
      name: 'is_recurring',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
