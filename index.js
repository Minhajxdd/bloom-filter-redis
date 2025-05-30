import http from "http";
import Redis from "ioredis";

const redis = new Redis();

const PORT = process.env.PORT || 3000;

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

const server = http.createServer((req, res) => {
  if (req.url === "/addusername" && req.method == "POST") {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      const data = JSON.parse(body);

      const { username } = data;

      if (!username || typeof username !== "string") {
        res.writeHead(400, { "Content-Type": "application/json" });

        return res.end(
          JSON.stringify({
            status: "failed",
            message: "username should be included",
          })
        );
      }

      const result = await redis.call("BF.EXISTS", BLOOM_KEY, username);

      if (result == 1) {

        res.writeHead(400, { "Content-Type": "application/json" });

        return res.end(
          JSON.stringify({
            status: "failed",
            message: "username exists",
          })
        );
      }

      await redis.call("BF.ADD", BLOOM_KEY, username);

      res.writeHead(201, { "Content-Type": "application/json" });

      return res.end(
        JSON.stringify({
          status: "success",
          message: "username added successfully",
        })
      );
    });
  }
});

server.listen(PORT, () => {
  console.log(`Server started at port : ${PORT}`);
});
