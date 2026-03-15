import { CollectionForm } from '../_components/collection-form';

export default function NewCollectionPage() {
    return (
        <div className="container mx-auto px-6 py-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-8">Create New Collection</h1>
            <CollectionForm />
        </div>
    );
}
