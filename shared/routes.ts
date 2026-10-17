import { z } from 'zod';
import { 
  insertReminderSchema, 
  reminders, 
  insertSmartDeviceSchema, 
  smartDevices,
  conversations,
  messages,
  insertMessageSchema
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  reminders: {
    list: {
      method: 'GET' as const,
      path: '/api/reminders',
      responses: {
        200: z.array(z.custom<typeof reminders.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/reminders',
      input: insertReminderSchema,
      responses: {
        201: z.custom<typeof reminders.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/reminders/:id',
      input: insertReminderSchema.partial(),
      responses: {
        200: z.custom<typeof reminders.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/reminders/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  smartDevices: {
    list: {
      method: 'GET' as const,
      path: '/api/devices',
      responses: {
        200: z.array(z.custom<typeof smartDevices.$inferSelect>()),
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/devices/:id',
      input: insertSmartDeviceSchema.partial(),
      responses: {
        200: z.custom<typeof smartDevices.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    // Adding a create/delete might be useful for simulation setup
    create: {
      method: 'POST' as const,
      path: '/api/devices',
      input: insertSmartDeviceSchema,
      responses: {
        201: z.custom<typeof smartDevices.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  chat: {
    conversations: {
      list: {
        method: 'GET' as const,
        path: '/api/conversations',
        responses: {
          200: z.array(z.custom<typeof conversations.$inferSelect>()),
        },
      },
      create: {
        method: 'POST' as const,
        path: '/api/conversations',
        input: z.object({ title: z.string() }),
        responses: {
          201: z.custom<typeof conversations.$inferSelect>(),
        },
      },
      get: {
        method: 'GET' as const,
        path: '/api/conversations/:id',
        responses: {
          200: z.object({
            id: z.number(),
            title: z.string(),
            messages: z.array(z.custom<typeof messages.$inferSelect>())
          }),
          404: errorSchemas.notFound,
        },
      }
    },
    messages: {
      create: {
        method: 'POST' as const,
        path: '/api/conversations/:id/messages',
        input: z.object({ content: z.string() }),
        responses: {
          200: z.object({ done: z.boolean() }), // Streaming response
        },
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
