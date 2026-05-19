const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const express = require('express');
const dotenv = require('dotenv')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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

async function run() {
  try {
    await client.connect();

    const db = client.db('drivefleet')
    const carsCollection = db.collection('all-cars')

    app.get('/all-car', async(req, res)=>{
      const result = await carsCollection.find().toArray()
      res.json(result)
    })

    app.get('/all-car/:id', async(req, res)=>{
      const {id} = await req.params
      const result = await carsCollection.findOne({_id: new ObjectId(id)})
      res.json(result)
    })

    app.get('/featured', async (req, res)=>{
      const result = await carsCollection.find({availability: true}).limit(6).toArray()
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

app.get('/', (req, res)=>{
    res.send('Server is running fine!')
})







app.listen(PORT, ()=>{
    console.log(`Server running on port ${PORT}`)
})