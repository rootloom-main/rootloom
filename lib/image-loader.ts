export default function supabaseLoader({
    src,
    width,
    quality,
}: {
    src: string;
    width: number;
    quality?: number;
}) {
    // If it's already an absolute URL (e.g. external image), return as is
    if (src.startsWith('http')) {
        return src;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // Assuming 'products' is the default bucket for relative paths in this loader context
    // or user passes full path like 'bucket/image.jpg'
    // For safety, let's assume src is the full path after /storage/v1/object/public/

    // Transform logic:
    // We want to use Supabase Image Transformations
    // https://supabase.com/docs/guides/storage/image-transformations

    // If src starts with check, we might want to just append params
    // But usually loader receives the 'src' prop from <Image src="..." />

    return `${supabaseUrl}/storage/v1/render/image/public/${src}?width=${width}&quality=${quality || 75}`;
}
