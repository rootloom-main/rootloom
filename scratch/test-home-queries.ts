import { HomeService } from '../lib/services/homeService';
import { ProductService } from '../lib/services/productService';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
    try {
        console.log('Testing HomeService.getSections()...');
        const sections = await HomeService.getSections();
        console.log('OK! Sections count:', sections?.length);
    } catch (e: any) {
        console.error('HomeService.getSections ERROR:', e.message || e);
    }

    try {
        console.log('Testing ProductService.getCategories()...');
        const categories = await ProductService.getCategories();
        console.log('OK! Categories count:', categories?.length);
    } catch (e: any) {
        console.error('ProductService.getCategories ERROR:', e.message || e);
    }

    try {
        console.log('Testing ProductService.getFeaturedProducts(8)...');
        const featured = await ProductService.getFeaturedProducts(8);
        console.log('OK! Featured products count:', featured?.length);
    } catch (e: any) {
        console.error('ProductService.getFeaturedProducts ERROR:', e.message || e);
    }

    try {
        console.log('Testing HomeService.getBanners()...');
        const banners = await HomeService.getBanners();
        console.log('OK! Banners count:', banners?.length);
    } catch (e: any) {
        console.error('HomeService.getBanners ERROR:', e.message || e);
    }
}

run();
