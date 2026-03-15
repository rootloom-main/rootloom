-- 1. Add metadata and display_order columns to banners
ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0;

-- 2. Seed existing hardcoded slides into banners table
-- We use DO block to avoid duplicate inserts if run multiple times
DO $$
BEGIN
    -- Slide 1: Forest Edition
    IF NOT EXISTS (SELECT 1 FROM public.banners WHERE title = 'The Forest Edition') THEN
        INSERT INTO public.banners (title, description, image_url, link, position, active, display_order, metadata)
        VALUES (
            'The Forest Edition',
            'Inspired by nature. Crafted for the modern man. Experience the deep tones of our latest arrival.',
            'https://images.pexels.com/photos/2897531/pexels-photo-2897531.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
            '/shop',
            'hero',
            true,
            1,
            '{
                "badge": "NEW COLLECTION",
                "cta": "Discover Now",
                "theme": "new-arrivals",
                "bgColor": "bg-[#1e2f23]",
                "textColor": "text-[#f9f5ed]",
                "ctaColor": "bg-[#f9f5ed] text-[#1e2f23] hover:bg-[#dcd6cb]"
            }'::jsonb
        );
    END IF;

    -- Slide 2: Purely Organic
    IF NOT EXISTS (SELECT 1 FROM public.banners WHERE title = 'Purely Organic') THEN
        INSERT INTO public.banners (title, description, image_url, link, position, active, display_order, metadata)
        VALUES (
            'Purely Organic',
            'Breathe easy in our ethically sourced linen collection. Soft on your skin, kind to the planet.',
            'https://images.unsplash.com/photo-1470058869958-2a77ade41c02?auto=format&fit=crop&w=1280&q=80',
            '/shop',
            'hero',
            true,
            2,
            '{
                "badge": "EARTH & FIBER",
                "cta": "Shop Earth Edit",
                "theme": "earth",
                "bgColor": "bg-[#dcd6cb]",
                "textColor": "text-[#1e2f23]",
                "ctaColor": "bg-[#1e2f23] text-[#f9f5ed] hover:bg-[#2a4030]"
            }'::jsonb
        );
    END IF;

    -- Slide 3: Handwoven Heritage
    IF NOT EXISTS (SELECT 1 FROM public.banners WHERE title = 'Handwoven Heritage') THEN
        INSERT INTO public.banners (title, description, image_url, link, position, active, display_order, metadata)
        VALUES (
            'Handwoven Heritage',
            'Every thread tells a story. Discover handcrafted masterpieces by master weavers of India.',
            'https://images.unsplash.com/photo-1606744837616-56c9a5c6a6eb?auto=format&fit=crop&w=1280&q=80',
            '/shop',
            'hero',
            true,
            3,
            '{
                "badge": "ARTISAN LEGACY",
                "cta": "Meet the Makers",
                "theme": "artisan",
                "bgColor": "bg-[#8c5a45]",
                "textColor": "text-[#f9f5ed]",
                "ctaColor": "bg-[#f9f5ed] text-[#8c5a45] hover:bg-[#dcd6cb]"
            }'::jsonb
        );
    END IF;

    -- Slide 4: The Blue Gold
    IF NOT EXISTS (SELECT 1 FROM public.banners WHERE title = 'The Blue Gold') THEN
        INSERT INTO public.banners (title, description, image_url, link, position, active, display_order, metadata)
        VALUES (
            'The Blue Gold',
            'Immerse yourself in the depth of natural indigo. Hand-dyed luxury for the discerning soul.',
            'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&w=1280&q=80',
            '/shop',
            'hero',
            true,
            4,
            '{
                "badge": "INDIGO TALES",
                "cta": "Explore Indigo",
                "theme": "indigo",
                "bgColor": "bg-[#1e2f23]",
                "textColor": "text-[#f9f5ed]",
                "ctaColor": "bg-[#f9f5ed] text-[#1e2f23] hover:bg-[#dcd6cb]"
            }'::jsonb
        );
    END IF;

    -- Slide 5: Sustainable Future
    IF NOT EXISTS (SELECT 1 FROM public.banners WHERE title = 'Sustainable Future') THEN
        INSERT INTO public.banners (title, description, image_url, link, position, active, display_order, metadata)
        VALUES (
            'Sustainable Future',
            'Fashion that respects nature. 100% biodegradable materials for a zero-waste lifestyle.',
            'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1280&q=80',
            '/shop',
            'hero',
            true,
            5,
            '{
                "badge": "CONSCIOUSLY CRAFTED",
                "cta": "Our Impact",
                "theme": "sustainable",
                "bgColor": "bg-[#f2efe9]",
                "textColor": "text-[#1e2f23]",
                "ctaColor": "bg-[#1e2f23] text-[#f9f5ed] hover:bg-[#2a4030]"
            }'::jsonb
        );
    END IF;
END $$;
