const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const express = require('express');
const dotenv = require('dotenv')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
dotenv.config()
const uri = process.env.MONGO_DB_URI;
const app = express()

const PORT = process.env.PORT;

app.use(cors())
app.use(express.json())

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


const JWKS = createRemoteJWKSet(
  new URL('http://localhost:3000/api/auth/jwks')
)

const verifyToken = async (req, res, next) => {
  const authHeader = req?.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ message: "Unauthorized" })
  }
  const token = authHeader.split(" ")[1]
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  try {
    const { payload } = await jwtVerify(token, JWKS)
    console.log(payload)
    next()
  } catch (error) {
    return res.status(403).json({ message: "Forbidden" })
  }
}

async function run() {
  try {


    await client.connect();

    const db = client.db('drivefleet')
    const carsCollection = db.collection('all-cars')
    const bookingCollection = db.collection('bookings')

    app.get('/all-car', async (req, res) => {
      const {search, type} = req.query;
      let query = {};
      if(search){
        query.car_name = { $regex: search, $options: 'i' };
      }

      if(type){
        query.type = type;
      }
      const result = await carsCollection.find(query).toArray()
      res.json(result)
    })

    app.post('/all-car', verifyToken, async (req, res) => {
      const carData = req.body;
      const result = await carsCollection.insertOne(carData);
      res.json(result);
    })



    app.get('/all-car/user/:email', verifyToken, async (req, res) => {
      const { email } = req.params
      const result = await carsCollection.find({ owner_email: email }).toArray()
      res.json(result)
    })

    app.get('/all-car/:id', verifyToken, async (req, res) => {
      const { id } = await req.params
      const result = await carsCollection.findOne({ _id: new ObjectId(id) })
      res.json(result)
    })

    app.patch('/all-car/:id', verifyToken, async (req, res) => {
      const { id } = req.params
      const updatedData = req.body
      const result = await carsCollection.updateOne({ _id: new ObjectId(id) }, { $set: updatedData })
      res.json(result)
    })

    app.delete('/all-car/:id', verifyToken, async (req, res) => {
      const { id } = req.params;
      const result = await carsCollection.deleteOne({ _id: new ObjectId(id) })
      res.json(result)
    })

    app.get('/featured', async (req, res) => {
      const result = await carsCollection.find({ availability: true }).limit(6).toArray()
      res.json(result)
    })

    app.get('/booking/:userId', verifyToken, async (req, res) => {
      const { userId } = req.params
      const result = await bookingCollection.find({ userId }).toArray();
      res.json(result)

    })


    app.post('/booking', verifyToken, async (req, res) => {
      const bookingData = req.body
      const result = await bookingCollection.insertOne(bookingData)
      await carsCollection.updateOne({ _id: new ObjectId(bookingData.carId) }, { $inc: { booking_count: 1 } })
      res.json(result)
    })


    app.delete('/booking/:bookingId', verifyToken, async (req, res) => {
      const { bookingId } = req.params
      const booking = await bookingCollection.findOne({ _id: new ObjectId(bookingId) })
      const result = await bookingCollection.deleteOne({ _id: new ObjectId(bookingId) })
      await carsCollection.updateOne({ _id: new ObjectId(booking.carId) }, { $inc: { booking_count: -1 } })
      res.json(result)
    })


    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Server is running fine!')
})







app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})