import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#e6f2ff',
                    100: '#cce5ff',
                    200: '#99ccff',
                    300: '#66b2ff',
                    400: '#3399ff',
                    500: '#006BFF', // Calendly blue
                    600: '#0056cc',
                    700: '#004099',
                    800: '#002b66',
                    900: '#001533',
                },
            },
        },
    },
    plugins: [],
};
export default config;
