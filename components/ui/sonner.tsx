'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-heirloom-white group-[.toaster]:text-deep-forest group-[.toaster]:border-stone-100 group-[.toaster]:shadow-2xl group-[.toaster]:rounded-2xl group-[.toaster]:font-sans group-[.toaster]:font-bold group-[.toaster]:px-6 group-[.toaster]:py-4',
          description: 'group-[.toast]:text-stone-500 group-[.toast]:font-medium group-[.toast]:text-xs',
          actionButton:
            'group-[.toast]:bg-deep-forest group-[.toast]:text-white group-[.toast]:rounded-lg group-[.toast]:px-4 group-[.toast]:h-9',
          cancelButton:
            'group-[.toast]:bg-stone-100 group-[.toast]:text-stone-500 group-[.toast]:rounded-lg group-[.toast]:px-4 group-[.toast]:h-9',
        },
      }}
      position="bottom-right"
      expand={true}
      richColors
      closeButton
      {...props}
    />
  );
};

export { Toaster };
