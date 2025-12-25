/**
 * Cloudflare Worker for R2 Image Upload
 * 
 * Deploy with:
 * 1. npm install -g wrangler
 * 2. wrangler login
 * 3. wrangler deploy
 * 
 * Required wrangler.toml configuration - see workers/wrangler.toml
 */

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    try {
      // Health check
      if (request.method === 'GET' && url.pathname === '/api/health') {
        return new Response(
          JSON.stringify({ status: 'ok', service: 'chiyadani-image-api' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Upload image
      if (request.method === 'POST' && url.pathname === '/api/upload') {
        const formData = await request.formData();
        const file = formData.get('file');
        let filename = formData.get('filename');

        if (!file) {
          return new Response(
            JSON.stringify({ error: 'No file provided' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        // Generate unique filename if not provided
        if (!filename) {
          const ext = file.name?.split('.').pop() || 'webp';
          filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        }

        // Determine content type
        let contentType = file.type || 'image/webp';
        if (filename.endsWith('.webp')) contentType = 'image/webp';
        else if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) contentType = 'image/jpeg';
        else if (filename.endsWith('.png')) contentType = 'image/png';
        else if (filename.endsWith('.gif')) contentType = 'image/gif';

        // Upload to R2
        await env.R2_BUCKET.put(filename, file, {
          httpMetadata: {
            contentType,
            cacheControl: 'public, max-age=31536000, immutable',
          },
        });

        const publicUrl = `${env.R2_PUBLIC_URL}/${filename}`;

        console.log(`Uploaded: ${filename} -> ${publicUrl}`);

        return new Response(
          JSON.stringify({
            success: true,
            url: publicUrl,
            key: filename,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Delete image
      if (request.method === 'DELETE' && url.pathname === '/api/upload') {
        const key = url.searchParams.get('key');
        
        if (!key) {
          return new Response(
            JSON.stringify({ error: 'No key provided' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        await env.R2_BUCKET.delete(key);
        
        console.log(`Deleted: ${key}`);

        return new Response(
          JSON.stringify({ success: true, deleted: key }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // List images (optional utility)
      if (request.method === 'GET' && url.pathname === '/api/images') {
        const listed = await env.R2_BUCKET.list({ limit: 100 });
        const images = listed.objects.map(obj => ({
          key: obj.key,
          size: obj.size,
          uploaded: obj.uploaded,
          url: `${env.R2_PUBLIC_URL}/${obj.key}`,
        }));

        return new Response(
          JSON.stringify({ images }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // 404 for unknown routes
      return new Response(
        JSON.stringify({ error: 'Not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  },
};
