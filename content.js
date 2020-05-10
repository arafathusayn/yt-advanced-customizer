let runningUnwantedCountrySearchResultsRemoval = false

const delay = (ms) =>
  new Promise((resolve) => {
    const id = setTimeout(() => resolve(clearTimeout(id)), ms)
  })

const getApiKey = () =>
  new Promise((resolve) => {
    chrome.storage.local.get("apiKey", (data) => {
      resolve(data.apiKey)
    })
  })

const getCountryBlacklist = () =>
  new Promise((resolve) => {
    chrome.storage.local.get("countryBlacklist", (data) => {
      resolve(
        data.countryBlacklist
          .split(",")
          .map((c) => c.trim())
          .filter((c) => c && c.length >= 1 && c.length < 3)
      )
    })
  })

const getChannelIdBlacklist = () =>
  new Promise((resolve) => {
    chrome.storage.local.get("channelIdBlacklist", (data) => {
      resolve(
        (data.channelIdBlacklist &&
          data.channelIdBlacklist.split(",").map((c) => c.trim())) ||
          []
      )
    })
  })

const removeUnwantedCountrySearchResults = async (
  countryBlacklist,
  target,
  channelIdBlacklist
) => {
  const html = target.innerHTML
    .split("<a ")
    .filter((text) => text.includes("/channel/") && text.includes("href="))
    .map((text) =>
      text.split("href=").filter((t) => t.startsWith('"/channel/'))
    )
    .flat()
    .map((text) => text.split('"').filter((t) => t.startsWith("/channel/")))
    .flat()
    .map((text) => text.replace("/channel/", ""))

  const channels = Array.from(new Set(html))
    .concat(channelIdBlacklist)
    .join(",")

  const apiKey = await getApiKey()

  if (apiKey === "") {
    window.console.error("Check API Key")
    return
  }

  const mapping = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channels}&key=${apiKey}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    }
  )
    .then((res) => res.json())
    .then((res) =>
      res.items.map((item) => ({
        id: item.id,
        country: item.snippet.country || "X",
      }))
    )

  if (!(mapping && mapping instanceof Array)) {
    return
  }

  for (const channel of mapping) {
    if (countryBlacklist.includes(channel.country)) {
      console.log(`Removing ${channel.id} from ${channel.country}`)
      const results = document.querySelectorAll("ytd-video-renderer")
      for (const result of results) {
        if (result.innerHTML.includes(`channel/${channel.id}`)) {
          result.remove()
        }
      }
    }
  }
}

const main = async (target) => {
  if (window.location.pathname == "/results") {
    const countryBlacklist = await getCountryBlacklist()
    const channelIdBlacklist = await getChannelIdBlacklist()

    if (countryBlacklist instanceof Array && countryBlacklist.length > 0) {
      await removeUnwantedCountrySearchResults(
        countryBlacklist,
        target,
        channelIdBlacklist
      )
    }
  }
}

const target = document.querySelector("ytd-item-section-renderer")

const config = { attributes: false, childList: true, subtree: true }

const callback = async () => {
  for (let i = 0; i < 30; i++) {
    if (runningUnwantedCountrySearchResultsRemoval) {
      await delay(2000)
      continue
    } else {
      runningUnwantedCountrySearchResultsRemoval = true
      try {
        await main(target)
      } catch (err) {
        window.console.error(err)
      }
      runningUnwantedCountrySearchResultsRemoval = false
      break
    }
  }
}

const observer = new MutationObserver(callback)

observer.observe(target, config)
