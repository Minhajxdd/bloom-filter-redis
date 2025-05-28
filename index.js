import express from "express";
import Redis from "ioredis";

const app = express();
const redis = new Redis();

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const BLOOM_KEY = "username";

(async function () {
  const exists = await redis.exists(BLOOM_KEY);

  if (!exists) {
    // (reserve_set, bloom_key, error_rate, expected_capactiy)
    await redis.call("BF.RESERVE", BLOOM_KEY, 0.001, 10000);
    console.log(`Bloom filter '${BLOOM_KEY}' created.`);
  } else {
    console.log(`Bloom filter '${BLOOM_KEY}' already exists.`);
  }
})();

app.post("/addusername", async (req, res) => {
  const { username } = req.body;

  if (!username || typeof username !== "string") {
    return res.status(400).send({
      status: "failed",
      message: "username should be included",
    });
  }

  const result = await redis.call("BF.EXISTS", BLOOM_KEY, username);

  if (result == 1) {
    return res.status(400).json({
      status: "failed",
      message: "username exists",
    });
  }

  await redis.call("BF.ADD", BLOOM_KEY, username);
  res.status(201).json({
    status: "success",
    message: "username added successfully",
  });
});

app.listen(PORT, () => {
  console.log(`Server started at port : ${PORT}`);
});
