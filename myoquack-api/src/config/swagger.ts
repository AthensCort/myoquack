import swaggerJsdoc from "swagger-jsdoc";

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "MyoQuack API",
      version: "1.0.0",
      description: "Documentación Swagger para MyoQuack",
    },
    servers: [
      {
        url: "http://localhost:4000",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ["./src/routes/*.ts", "./src/routes/*.js"], // lee *.ts y *.js por seguridad de entorno
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);