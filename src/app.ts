import express from "express";

const app = express();

app.use(express.json());

app.use("/health", (_, res) => {
  res.json({ status: "ok" });
});

export { app };
