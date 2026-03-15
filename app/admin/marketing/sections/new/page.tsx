import { SectionForm } from '../_components/section-form';

export default function NewSectionPage() {
    return (
        <div className="container mx-auto px-6 py-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-8">Add New Home Section</h1>
            <div className="max-w-2xl">
                <SectionForm />
            </div>
        </div>
    );
}
