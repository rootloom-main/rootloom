import { z } from 'zod';
import { logger } from './logger';

export type ActionState<T> = {
    data?: T;
    error?: string;
    fieldErrors?: Record<string, string[]>;
};

export function createSafeAction<TInput extends z.Schema, TOutput>(
    schema: TInput,
    handler: (validatedData: z.infer<TInput>) => Promise<ActionState<TOutput>>
) {
    return async (data: z.infer<TInput>): Promise<ActionState<TOutput>> => {
        try {
            const validationResult = schema.safeParse(data);

            if (!validationResult.success) {
                return {
                    fieldErrors: validationResult.error.flatten().fieldErrors as Record<string, string[]>,
                    error: 'Invalid input data',
                };
            }

            return await handler(validationResult.data);
        } catch (error: any) {
            logger.error('Server Action Error', { error: error.message });
            return {
                error: error.message || 'Something went wrong',
            };
        }
    };
}
