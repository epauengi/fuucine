export default {
    content: ["./index.html", "./src/**/*.{ts,tsx}"],
    theme: {
        extend: {
            fontFamily: {
                display: ["Be Vietnam Pro", "sans-serif"],
                body: ["Be Vietnam Pro", "sans-serif"],
            },
            colors: {
                void: "#030305",
                neon: {
                    cyan: "#00F0FF",
                    pink: "#FF0055",
                },
                zincText: "#A1A1AA",
            },
            boxShadow: {
                neon: "0 0 28px rgba(0, 240, 255, 0.22)",
            },
        },
    },
    plugins: [],
};
