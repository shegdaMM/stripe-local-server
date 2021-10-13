import fs from 'fs';
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Stripe from "stripe";
const stripe = new Stripe('sk_test_51JiflPHQb3wfH64vcbiIyngFmnffMfuGhohstDqqWeTDZP0AHyXxNdjRf3o5nwcFrjwRrV8yOUVfM1ucxDIgQYHK00ELetxiqv');

const app = express();
const port = 3000;
const productsObject = JSON.parse(fs.readFileSync('products.json'));

app.use(cors());
// dotenv.config();
app.use(function (req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');
    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

app.get('/', (req, res) => {
    res.send({ message: 'hello'});
});

app.get('/products', (req, res) => {
    res.json(productsObject);
});


app.get('/products/:id', (req, res) => {
    const productId = req.params.id;
    for (let product of productsObject.data) {
        if (product._id === productId) {
            res.json(product);
            return;
        }
    }
    res.status(404).send(`not found product by ${productId}`);
});


app.post('/payment/:id', async function (req, res) {
    const productId = req.params.id;
    let paymentProduct;
    for (let product of productsObject.data) {
        if (product._id === productId) {
            paymentProduct = product
        }
    }
    try {
      const intent = await stripe.paymentIntents.create({
          amount: +(paymentProduct.price) * 100,
          currency: 'usd',
          payment_method_types: ['card'],
          metadata: {
            orderId: paymentProduct._id
          }
      });
      res.json({client_secret: intent.client_secret});
    } catch (e) {
      res.status(500).send(`not pay product by ${productId}`);
    }
})

app.post(
    "/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (request, response) => {
      const sig = request.headers["stripe-signature"];
  
      let event;
  
      try {
        event = stripe.webhooks.constructEvent(
          request.body,
          sig,
          process.env.END_POINT_SECRET
        );
        //   console.log("type", event);
      } catch (err) {
        //   console.log("type2", err);
        response.status(400).send(`Webhook Error: ${err.message}`);
      }
  
      switch (event.type) {
        case "payment_intent.succeeded":
          const paymentIntent = event.data.object;
          console.log("PaymentIntent was successful!");
          break;
        case "payment_method.attached":
          const paymentMethod = event.data.object;
          console.log("PaymentMethod was attached to a Customer!");
          break;
        // ... handle other event types
        default:
          console.log(`Unhandled event type ${event.type}`);
      }
  
      // Return a response to acknowledge receipt of the event
      response.json({ received: true });
    }
  );


app.listen(port, () => console.log(`server side listening on port ${port}!`))