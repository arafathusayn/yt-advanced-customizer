chrome.storage.local.get(
  ["apiKey", "countryBlacklist", "channelIdBlacklist"],
  (data) => {
    apiKey.value = ""
    countryBlacklist.value = data.countryBlacklist || ""
    channelIdBlacklist.value = data.channelIdBlacklist || ""
  }
)

apiKey.addEventListener("focus", (e) => {
  e.target.select()
})

customButton.addEventListener("click", (e) => {
  e.preventDefault()

  chrome.storage.local.set({
    apiKey: apiKey.value,
    countryBlacklist: countryBlacklist.value,
    channelIdBlacklist: channelIdBlacklist.value,
  })

  alert("SETTINGS SAVED")
})
