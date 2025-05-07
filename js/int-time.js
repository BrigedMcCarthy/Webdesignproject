async function fetchExactDateFromServer() {
    const resp = await fetch("https://worldtimeapi.org/api/timezone/Europe/Paris");
    if (!resp.ok) {
      throw new Error("Network Error");
    }
    return +new Date((await resp.json()).datetime);
  }
  let offset = 0;
  function getTimeStamp() {
    return Math.round(performance.now() - offset);
  }
  function updateTime() {
    return fetchExactDateFromServer()
      .then((officialTime) => {
        offset = performance.now() - officialTime;
      })
      .catch((err) => {
        console.error(err);
        return Promise.reject(err);
      });
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === 'visible') {
      updateTime();
    }
  });
  // test by logging the difference between server-side and local (should always be about the same difference)
  const btn = document.querySelector("button");
  updateTime().then(() => {
    btn.onclick = (evt) => console.log(getTimeStamp(), Date.now(), getTimeStamp() - Date.now());
    btn.disabled = false;
  });