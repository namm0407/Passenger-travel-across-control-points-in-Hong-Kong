# Passenger-travel-across-control-points-in-Hong-Kong

It serves APIs for users to retrieve data from a MongoDB server containing daily statistics about passengers who have travelled across Hong Kong control points.


## Build with
This project was built using these technologies:
- Node.js
- Express.js
- MongoDB
- Mongoose

## Feature

### Task A : monitors the database connection & terminates the program if the connection to the database is lost.
- set up a connection to the MongoDB database using Mongoose for accessing the data
- set up a schema and a model for accessing the “daylog” collection.

### Task B : express routing handler to handle all GET requests
For example, to retrieve the raw data for 30/12/2024, the client should send a GET request to http://localhost:8080/HKPassenger/v1/data/2024/12/30. 
This request returns the following JSON string: 
[{"Date":"12/30/2024","Flow":"Arrival","Local":391739,"Mainland":89865,"Others":45696},{"Da
 te":"12/30/2024","Flow":"Departure","Local":283917,"Mainland":85993,"Others":44449}]

 For example, a GET request to http://localhost:8080/HKPassenger/v1/data/2024/12/30?num=5 returns the raw data from 30/12/2024 to 3/1/2025. 
- To retrieve raw data for a specific date, the system connects to the database to retrieve all fields
-  If the request extends beyond the last date in the database, the API should return the available raw data up to the last date it has to fulfill the request. 
- Send the data as a single JSON string to the client.  
- If the request specifies a date that exceeds the last date in the database, the API should return 
an empty JSON array. 
- out of range :  the API respond with an error JSON string and an HTTP status code of 400. 

### Task C


### Task D


### Task E


## data from
https://data.gov.hk/en-data/dataset/hk-immd-set5-statistics-daily-passenger-traffic
sourced from the Hong Kong Government Immigration Department, includes daily inbound and outbound trips since 2021, categorized by type of traveller such as Hong Kong Residents, Mainland Visitors, and Other Visitors. 


curl --json @newdailylog-01.json http://localhost:8080/HKPassenger/v1/data -i