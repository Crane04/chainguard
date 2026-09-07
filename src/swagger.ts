import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Digital Evidence Integrity API",
      version: "1.0.0",
      description:
        "Chain-of-custody and tamper-detection API for digital evidence — ICSC 2026 Hackathon, Track H."
    },
    servers: [
      {
        url: process.env.API_BASE_URL || "http://localhost:4000"
      }
    ]
  },
  apis: ["./src/routes/*.ts"]
};

export const swaggerSpec = swaggerJsdoc(options);
