function getInternetTime() {
    return fetch('http://worldtimeapi.org/api/timezone/Etc/UTC') // Using World Time API, setting timezone to UTC
      .then(response => response.json())
      .then(data => {
        const dateTimeString = data.datetime; // Retrieves the date and time string from the API response
        const date = new Date(dateTimeString); // Creates a new Date object from the string
        return date; // Returns the Date object representing the internet time
      })
      .catch(error => {
        console.error('Error fetching internet time:', error);
        return new Date(); // Returns the local time if fetching fails
      });
  }
  
  getInternetTime().then(internetTime => {
    console.log('Internet time:', internetTime);
    const hours = internetTime.getUTCHours();
    const minutes = internetTime.getUTCMinutes();
    const seconds = internetTime.getUTCSeconds();
  
    console.log(`Current time: ${hours}:${minutes}:${seconds} UTC`);
  });