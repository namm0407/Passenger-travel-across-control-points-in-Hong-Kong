//Task A, B, C

const express = require('express')
const app = express();

// Parse URL-encoded bodies (forms)
app.use(express.urlencoded({extended: false}));
// Middleware to parse JSON bodies
app.use(express.json());

//connect to MongoDB (taskA)
var mongoose = require('mongoose');
mongoose.connect('mongodb://mongodb/DailyFlow')
var db = mongoose.connection;
db.on("error", (err) => {
  console.log("MongoDB connection error: "+err);
});
db.on("connected", () => {
  console.log("Connected to MongoDB");
});

//Set the Schema
var mySchema = new mongoose.Schema({
  code: String,
  name: String
});

//Create my model
var record = mongoose.model("record", mySchema);

app.get('/test.html', (req, res) => {
  let newRecord = new record({
    code: 'COMP3322',
    name: 'Modern Technologies on WWW'
  });
  newRecord.save()
  .then(result => {
      console.log("Record added");
      //retrieve all records
      record.findOne()
      .then(result => {
          let message = "<!DOCTYPE><html><head><title>TEST MongoDB</title></head><body><h1>Testing Mongoose connection with Express</h1>";
          message += `<p>Course code : ${result.code}<br>Course title : ${result.name}</p>`;
          message += "</body></html>";
          res.send(message);
      })
      .catch(err => {
          console.log("MongoDB error: "+err);
          res.sendStatus(500);
      });    
  })
  .catch(err => {
      console.log("MongoDB error: "+err);
      res.sendStatus(500);
  });
});


//taskA
//Define Schema
const dayLogSchema = new mongoose.Schema({
  Date: String,
  Flow: String,
  Local: Number,
  Mainland: Number,
  Others: Number
}, { collection: 'daylog' });

const DayLog = mongoose.model('DayLog', dayLogSchema, 'daylog');

// Helper functions
function isValidDate(year, month, day) {
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === parseInt(year) &&
         date.getMonth() === month - 1 &&
         date.getDate() === parseInt(day);
}

function getNextDate(dateString) {
  const [month, day, year] = dateString.split('/').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + 1);
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

//for testing if the daylog is imported
app.get('/test-daylog', async (req, res) => {
  try {
    const count = await DayLog.countDocuments();
    res.send(`Found ${count} records in daylog collection.`);
  } catch (err) {
    res.status(500).send(`Error: ${err.message}`);
  }
});

//Task B
app.get('/HKPassenger/v1/data/:year/:month/:day', async (req, res) => {
  try {
      const { year, month, day } = req.params;
      const numDays = req.query.num ? parseInt(req.query.num) : 1;

      // Input validation
      if (isNaN(year) || year < 2021 || year > 2025) {
          return res.status(400).json({ error: "Wrong year input - must be a number between 2021 - 2025." });
      }
      if (isNaN(month) || month < 1 || month > 12) {
          return res.status(400).json({ error: "Wrong month input - must be a number between 1 - 12." });
      }
      if (isNaN(day) || day < 1 || day > 31) {
          return res.status(400).json({ error: "Wrong date input - must be a number between 1 - 31." });
      }
      if (!isValidDate(year, month, day)) {
          return res.status(400).json({ error: `${day}/${month}/${year} is not a valid calendar date!` });
      }
      if (req.query.num && (isNaN(numDays) || numDays < 1)) {
          return res.status(400).json({ error: "Wrong query string num - must be a number greater than zero" });
      }

      // Prepare date range
      const startDate = new Date(year, month - 1, day);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + numDays - 1);

      // Format dates for query (MM/DD/YYYY)
      const dateStrings = [];
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const month = currentDate.getMonth() + 1;
        const day = currentDate.getDate();
        const year = currentDate.getFullYear();
        dateStrings.push(`${month}/${day}/${year}`);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Query for all dates in the range
      const records = await DayLog.find({
        Date: { $in: dateStrings }
      }).select('-_id');

      // Sort the records in JavaScript to maintain the exact order of dateStrings
      const sortedRecords = records.sort((a, b) => {
        const aIndex = dateStrings.indexOf(a.Date);
        const bIndex = dateStrings.indexOf(b.Date);
        return aIndex - bIndex || (a.Flow === 'Arrival' ? -1 : 1);
      });

      res.json(sortedRecords);
  } catch (err) {
      res.status(500).json({ error: "Experiencing database error!!" });
  }
});


//Task C
app.get('/HKPassenger/v1/aggregate/:group/:year/:month?', async (req, res) => {
  try {
      const { group, year, month } = req.params;
      
      // Input validation
      if (!['local', 'mainland', 'others', 'all'].includes(group)) {
          return res.status(400).json({ error: `Cannot GET /HKPassenger/v1/aggregate/${group}/${year}${month ? '/' + month : ''}` });
      }
      if (isNaN(year) || year < 2021 || year > 2025) {
          return res.status(400).json({ error: `Cannot GET /HKPassenger/v1/aggregate/${group}/${year}${month ? '/' + month : ''}` });
      }
      if (month && (isNaN(month) || month < 1 || month > 12)) {
          return res.status(400).json({ error: `Cannot GET /HKPassenger/v1/aggregate/${group}/${year}/${month}` });
      }

      let matchQuery = month ? 
          { Date: new RegExp(`^${month}/\\d{1,2}/${year}$`) } :
          { Date: new RegExp(`^\\d{1,2}/\\d{1,2}/${year}$`) };

      const records = await DayLog.find(matchQuery);

      if (records.length === 0) {
          return res.json([]);
      }

      // Get unique dates and sort them chronologically
      const dates = [...new Set(records.map(r => r.Date))].sort((a, b) => {
        const [aMonth, aDay, aYear] = a.split('/').map(Number);
        const [bMonth, bDay, bYear] = b.split('/').map(Number);
        return new Date(aYear, aMonth - 1, aDay) - new Date(bYear, bMonth - 1, bDay);
      });

      const result = [];

      if (month) {
          // Monthly aggregation (by day)
          for (const date of dates) {
              const arrivals = records.find(r => r.Date === date && r.Flow === 'Arrival');
              const departures = records.find(r => r.Date === date && r.Flow === 'Departure');
              
              const entry = { Date: date };
              
              if (group.toLowerCase() === 'all') {
                  entry.Local = (arrivals?.Local || 0) - (departures?.Local || 0);
                  entry.Mainland = (arrivals?.Mainland || 0) - (departures?.Mainland || 0);
                  entry.Others = (arrivals?.Others || 0) - (departures?.Others || 0);
                  entry.Total = entry.Local + entry.Mainland + entry.Others;
              } else {
                  const field = group.charAt(0).toUpperCase() + group.slice(1);
                  entry[field] = (arrivals?.[field] || 0) - (departures?.[field] || 0);
              }
              
              result.push(entry);
          }
      } else {
          // Yearly aggregation (by month)
          const months = [...new Set(dates.map(d => d.split('/')[0]))].sort((a, b) => a - b);
          
          for (const m of months) {
              const monthRecords = records.filter(r => r.Date.startsWith(`${m}/`));
              let localSum = 0, mainlandSum = 0, othersSum = 0;
              
              for (const r of monthRecords) {
                  const multiplier = r.Flow === 'Arrival' ? 1 : -1;
                  localSum += (r.Local || 0) * multiplier;
                  mainlandSum += (r.Mainland || 0) * multiplier;
                  othersSum += (r.Others || 0) * multiplier;
              }
              
              const entry = { Month: `${m}/${year}` };
              
              if (group.toLowerCase() === 'all') {
                  entry.Local = localSum;
                  entry.Mainland = mainlandSum;
                  entry.Others = othersSum;
                  entry.Total = localSum + mainlandSum + othersSum;
              } else {
                  const field = group.charAt(0).toUpperCase() + group.slice(1);
                  entry[field] = { Local: localSum, Mainland: mainlandSum, Others: othersSum }[field];
              }
              
              result.push(entry);
          }
      }

      res.json(result);
  } catch (err) {
      res.status(500).json({ error: "Experiencing database error!!" });
  }
});

// Add error handling for incorrect paths
app.get('/HKPassenger/v1/:invalidPath*', (req, res) => {
  const fullPath = `/HKPassenger/v1/${req.params.invalidPath}${req.params[0] || ''}`;
  res.status(400).json({ error: `Cannot GET ${fullPath}` });
});



app.listen(8080, () => {
  console.log('ASS4 App listening on port 8080!')
});
