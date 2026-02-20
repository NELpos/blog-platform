import { z } from 'zod'
import { createMcpHandler } from 'mcp-handler'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticateMcpRequest } from '@/lib/mcp/auth'
import { createDraftPostForMcp, readOwnPostForMcp, searchOwnPostsForMcp } from '@/lib/mcp/posts'

function createHandlerForUser(userId: string) {
  return createMcpHandler(
    (server) => {
      server.registerTool(
        'post_search',
        {
          title: 'Search Posts',
          description: 'Search my posts by keyword and return lightweight context items.',
          inputSchema: {
            query: z.string().optional(),
            limit: z.number().int().min(1).max(20).optional(),
          },
        },
        async ({ query, limit }) => {
          const supabase = createAdminClient()
          const results = await searchOwnPostsForMcp({
            supabase,
            userId,
            query,
            limit,
          })

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ count: results.length, results }, null, 2),
              },
            ],
          }
        },
      )

      server.registerTool(
        'post_read',
        {
          title: 'Read Post',
          description: 'Read a single post by post_id (preferred) or slug.',
          inputSchema: {
            post_id: z.string().uuid().optional(),
            slug: z.string().min(1).optional(),
          },
        },
        async ({ post_id, slug }) => {
          const supabase = createAdminClient()
          const post = await readOwnPostForMcp({
            supabase,
            userId,
            postId: post_id,
            slug,
          })

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(post, null, 2),
              },
            ],
          }
        },
      )

      server.registerTool(
        'post_create',
        {
          title: 'Create Post Draft',
          description: 'Create a new draft post from markdown content.',
          inputSchema: {
            title: z.string().min(1).max(200),
            content_markdown: z.string(),
          },
        },
        async ({ title, content_markdown }) => {
          const supabase = createAdminClient()
          const created = await createDraftPostForMcp({
            supabase,
            userId,
            title,
            contentMarkdown: content_markdown,
          })

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ ...created, published: false }, null, 2),
              },
            ],
          }
        },
      )
    },
    {},
    {
      basePath: '/api/mcp',
      maxDuration: 60,
      verboseLogs: process.env.NODE_ENV !== 'production',
    },
  )
}

async function handler(request: Request) {
  const auth = await authenticateMcpRequest(request)
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status })
  }

  const mcpHandler = createHandlerForUser(auth.actor.userId)
  return mcpHandler(request)
}

export { handler as GET, handler as POST, handler as DELETE }
