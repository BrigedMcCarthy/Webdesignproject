     // create a function to update the date and time
     function updateDateTime() {
        // create a new `Date` object
        const now = new Date();

        // get the current date and time as a string
        // REMEMBER TO CHANGE THIS TO PULL TIME FROM A SERVER
        const currentDateTime = now.toLocaleString();

        // update the `textContent` property of the `span` element with the `id` of `datetime`
        document.querySelector('#datetime').textContent = currentDateTime;
      }

      // who cares that this isnt efficient the website has to ship on time.
      setInterval(updateDateTime, 1000);
     