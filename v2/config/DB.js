const {Pool} = require('pg')
require('dotenv').config()

// const pool = new Pool({
//   user: process.env.DB_USER,
//   host: process.env.DB_HOST,
//   database: process.env.DB_NAME,
//   password: process.env.DB_PASSWORD,
//   port: process.env.DB_PORT,
// });

const pool = new Pool({
  connectionString:process.env.DB_STRING,
  ssl:{
    rejectUnauthorized:false
  }
})
pool.connect().then(()=>console.log("Connected to database")).catch(err=>console.log(`Error`,err))

module.exports = pool; 