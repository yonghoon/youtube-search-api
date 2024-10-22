import axios from "axios"
import _ from "lodash"
const youtubeEndpoint = `https://www.youtube.com`

export interface InitData {
  videoDetails?: any
  metadata?: any
  contents?: any
}

export interface NextPage {
  nextPageToken?: string
  nextPageContext: {
    continuation: any
  }
}

export interface SearchOutput {
  items: Video[]
  nextPage?: NextPage
}

export interface RenderedContent {
  channelRenderer: {
    channelId: string
    thumbnail: string
    title: {
      simpleText: string
    }
  }
  videoRenderer: {
    videoId: string
  }
  playlistRenderer: {
    playlistId: string
    thumbnails?: string
    title: {
      simpleText: string
    },
    videoCount: number
    videos: PlaylistData
  }
}

export interface PlaylistData {
  items: any[]
  metadata: any
}

export interface Video {
  id?: string
  type?: string
  thumbnail?: string
  title?: string
  channelTitle?: string
  shortBylineText?: string
  length?: number
  isLive?: boolean
  videos?: PlaylistData
  videoCount?: number
}

export interface YoutubeInitData {
  initdata: InitData
  apiToken?: string
  context?: unknown
}

export class YoutubeSearchApi {
  async getYoutubeInitData(url: string): Promise<YoutubeInitData> {
    const output: YoutubeInitData = {
      initdata: {},
    }
    try {
      const page = await axios.get(encodeURI(url))
      const ytInitData = page.data.split("var ytInitialData =")
      if (ytInitData && ytInitData.length > 1) {
        const data = ytInitData[1].split("</script>")[0].slice(0, -1)

        if (page.data.split("innertubeApiKey").length > 0) {
          output.apiToken = page.data
            .split("innertubeApiKey")[1]
            .trim()
            .split(",")[0]
            .split('"')[2]
        }

        if (page.data.split("INNERTUBE_CONTEXT").length > 0) {
          output.context = JSON.parse(
            page.data.split("INNERTUBE_CONTEXT")[1].trim().slice(2, -2)
          )
        }

        output.initdata = await JSON.parse(data) as InitData
        return output
      } else {
        console.error("cannot_get_init_data")
        return await Promise.reject("cannot_get_init_data")
      }
    } catch (error) {
      console.error("getYoutubeInitData error", error)
      throw error
    }
  }


  async getYoutubePlayerDetail(url: string) {
    var initdata: InitData = {}
    try {
      const page = await axios.get(encodeURI(url))
      const ytInitData = await page.data.split("var ytInitialPlayerResponse =")
      if (ytInitData && ytInitData.length > 1) {
        const data = await ytInitData[1].split("</script>")[0].slice(0, -1)
        initdata = await JSON.parse(data)
        return await Promise.resolve({ ...initdata.videoDetails })
      } else {
        console.error("cannot_get_player_data")
        return await Promise.reject("cannot_get_player_data")
      }
    } catch (error) {
      console.error("getYoutubePlayerDetail error", error)
      throw error
    }
  }


  async search(
    keyword: string,
    withPlaylist = false,
    limit = 0,
    options: { type: unknown }[] = []
  ): Promise<SearchOutput> {
    let endpoint = await `${youtubeEndpoint}/results?search_query=${keyword}`
    try {
      if (Array.isArray(options) && options.length > 0) {
        const type = options.find((option) => option.type)
        if (typeof type == "object") {
          if (typeof type.type == "string") {
            switch (type.type.toLowerCase()) {
              case "video":
                endpoint = `${endpoint}&sp=EgIQAQ%3D%3D`
                break
              case "channel":
                endpoint = `${endpoint}&sp=EgIQAg%3D%3D`
                break
              case "playlist":
                endpoint = `${endpoint}&sp=EgIQAw%3D%3D`
                break
              case "movie":
                endpoint = `${endpoint}&sp=EgIQBA%3D%3D`
                break
            }
          }
        }
      }
      const page = await this.getYoutubeInitData(endpoint)

      const contents: any[] = _.get(page.initdata, "contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents", [])

      let contToken = {}

      let items: Video[] = []

      await contents.forEach((content) => {
        const token = _.get(content, "continuationItemRenderer.continuationEndpoint.continuationCommand.token")
        const rendererContents: RenderedContent[] = _.get(content, "itemSectionRenderer.contents", [])
        if (!_.isNil(token)) {
          contToken = token
        } else if (!_.isEmpty(rendererContents)) {
          rendererContents.forEach(async (renderedContent) => {
            if (renderedContent.channelRenderer) {
              let channelRenderer = renderedContent.channelRenderer
              items.push({
                id: channelRenderer.channelId,
                type: "channel",
                thumbnail: channelRenderer.thumbnail,
                title: channelRenderer.title.simpleText
              })
            } else {
              let videoRender = renderedContent.videoRenderer
              let playListRender = renderedContent.playlistRenderer

              if (videoRender && videoRender.videoId) {
                items.push(await this.getVideoRender(renderedContent))
              }
              if (withPlaylist) {
                if (playListRender && playListRender.playlistId) {
                  items.push({
                    id: playListRender.playlistId,
                    type: "playlist",
                    thumbnail: playListRender.thumbnails,
                    title: playListRender.title.simpleText,
                    length: playListRender.videoCount,
                    videos: playListRender.videos,
                    videoCount: playListRender.videoCount,
                    isLive: false
                  })
                }
              }
            }
          })

        }


      })
      const apiToken = page.apiToken
      const context = page.context
      const nextPageContext = await { context: context, continuation: contToken }
      const itemsResult = limit != 0 ? items.slice(0, limit) : items
      return await Promise.resolve({
        items: itemsResult,
        nextPage: { nextPageToken: apiToken, nextPageContext: nextPageContext }
      })
    } catch (ex) {
      await console.error(ex)
      return await Promise.reject(ex)
    }
  }

  async getNextPage(
    nextPage: NextPage,
    withPlaylist = false,
    limit = 0,
  ): Promise<SearchOutput> {
    const endpoint =
      await `${youtubeEndpoint}/youtubei/v1/search?key=${nextPage.nextPageToken}`
    try {
      const page = await axios.post(
        encodeURI(endpoint),
        nextPage.nextPageContext
      )
      const item1 =
        page.data.onResponseReceivedCommands[0].appendContinuationItemsAction
      let items: Video[] = []
      item1.continuationItems.forEach((conitem: any) => {
        if (conitem.itemSectionRenderer) {
          conitem.itemSectionRenderer.contents.forEach(async (content: any) => {
            let videoRender = content.videoRenderer
            let playListRender = content.playlistRenderer
            if (videoRender && videoRender.videoId) {
              items.push(await this.getVideoRender(content))
            }
            if (withPlaylist) {
              if (playListRender && playListRender.playlistId) {
                items.push({
                  id: playListRender.playlistId,
                  type: "playlist",
                  thumbnail: playListRender.thumbnails,
                  title: playListRender.title.simpleText,
                  length: playListRender.videoCount,
                  videos: await this.getPlaylistData(playListRender.playlistId)
                })
              }
            }
          })
        } else if (conitem.continuationItemRenderer) {
          nextPage.nextPageContext.continuation =
            conitem.continuationItemRenderer.continuationEndpoint.continuationCommand.token
        }
      })
      const itemsResult = limit != 0 ? items.slice(0, limit) : items
      return await Promise.resolve({ items: itemsResult, nextPage })
    } catch (ex) {
      await console.error(ex)
      return await Promise.reject(ex)
    }
  }

  async getPlaylistData(playlistId: string, limit = 0): Promise<PlaylistData> {
    const endpoint = `${youtubeEndpoint}/playlist?list=${playlistId}`
    try {
      const initData = await this.getYoutubeInitData(endpoint)
      const sectionListRenderer = initData.initdata
      const metadata = sectionListRenderer.metadata
      if (sectionListRenderer && sectionListRenderer.contents) {
        const videoItems = sectionListRenderer.contents
          .twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content
          .sectionListRenderer.contents[0].itemSectionRenderer.contents[0]
          .playlistVideoListRenderer.contents
        let items: any[] = []
        await videoItems.forEach((item: any) => {
          let videoRender = item.playlistVideoRenderer
          if (videoRender && videoRender.videoId) {
            items.push(this.getVideoRender(item))
          }
        })
        const itemsResult = limit != 0 ? items.slice(0, limit) : items
        return { items: itemsResult, metadata: metadata }
      } else {
        return await Promise.reject("invalid_playlist")
      }
    } catch (ex) {
      await console.error(ex)
      return await Promise.reject(ex)
    }
  }

  async getSuggestData(limit = 0) {
    const endpoint = await `${youtubeEndpoint}`
    try {
      const page = await this.getYoutubeInitData(endpoint)
      const sectionListRenderer = page.initdata.contents
        .twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content
        .richGridRenderer.contents
      let items: any[] = []
      let otherItems: any[] = []
      await sectionListRenderer.forEach(async (item: any) => {
        if (item.richItemRenderer && item.richItemRenderer.content) {
          let videoRender = item.richItemRenderer.content.videoRenderer
          if (videoRender && videoRender.videoId) {
            items.push(await this.getVideoRender(item.richItemRenderer.content))
          } else {
            otherItems.push(videoRender)
          }
        }
      })
      const itemsResult = limit != 0 ? items.slice(0, limit) : items
      return await Promise.resolve({ items: itemsResult })
    } catch (ex) {
      await console.error(ex)
      return await Promise.reject(ex)
    }
  }

  async getChannelById(channelId: string) {
    const endpoint = await `${youtubeEndpoint}/channel/${channelId}`
    try {
      const page = await this.getYoutubeInitData(endpoint)
      const tabs = page.initdata.contents.twoColumnBrowseResultsRenderer.tabs
      const items = tabs
        .map((json: any) => {
          if (json && json.tabRenderer) {
            const tabRenderer = json.tabRenderer
            const title = tabRenderer.title
            const content = tabRenderer.content
            return { title, content }
          }
        })
        .filter((y: any) => typeof y != "undefined")
      return await Promise.resolve(items)
    } catch (ex) {
      return await Promise.reject(ex)
    }
  }

  async getVideoDetails(videoId: string) {
    const endpoint = await `${youtubeEndpoint}/watch?v=${videoId}`
    try {
      const page = await this.getYoutubeInitData(endpoint)
      const playerData = await this.getYoutubePlayerDetail(endpoint)

      const result = await page.initdata.contents.twoColumnWatchNextResults
      const firstContent = await result.results.results.contents[0]
        .videoPrimaryInfoRenderer
      const secondContent = await result.results.results.contents[1]
        .videoSecondaryInfoRenderer
      const res = await {
        id: playerData.videoId,
        title: firstContent.title.runs[0].text,
        thumbnail: playerData.thumbnail,
        isLive: firstContent.viewCount.videoViewCountRenderer.hasOwnProperty(
          "isLive"
        )
          ? firstContent.viewCount.videoViewCountRenderer.isLive
          : false,
        channel:
          playerData.author ||
          secondContent.owner.videoOwnerRenderer.title.runs[0].text,
        channelId: playerData.channelId,
        description: playerData.shortDescription,
        keywords: playerData.keywords,
        suggestion: await Promise.all(
          result.secondaryResults.secondaryResults.results
            .filter((y: any) => y.hasOwnProperty("compactVideoRenderer"))
            .map((x: any) => this.getCompactVideoRenderer(x))
        )
      }
      return await Promise.resolve(res)
    } catch (ex) {
      return await Promise.reject(ex)
    }
  }

  async getVideoRender(json: any): Promise<Video> {
    try {
      if (json && (json.videoRenderer || json.playlistVideoRenderer)) {
        let videoRenderer = null
        if (json.videoRenderer) {
          videoRenderer = json.videoRenderer
        } else if (json.playlistVideoRenderer) {
          videoRenderer = json.playlistVideoRenderer
        }
        var isLive = false
        if (
          videoRenderer.badges &&
          videoRenderer.badges.length > 0 &&
          videoRenderer.badges[0].metadataBadgeRenderer &&
          videoRenderer.badges[0].metadataBadgeRenderer.style ==
          "BADGE_STYLE_TYPE_LIVE_NOW"
        ) {
          isLive = true
        }
        if (videoRenderer.thumbnailOverlays) {
          videoRenderer.thumbnailOverlays.forEach((thumbnailOverlay: { thumbnailOverlayTimeStatusRenderer: { style: string } }) => {
            if (
              thumbnailOverlay.thumbnailOverlayTimeStatusRenderer &&
              thumbnailOverlay.thumbnailOverlayTimeStatusRenderer.style &&
              thumbnailOverlay.thumbnailOverlayTimeStatusRenderer.style == "LIVE"
            ) {
              isLive = true
            }
          })
        }
        const id = videoRenderer.videoId
        const thumbnail = videoRenderer.thumbnail
        const title = videoRenderer.title.runs[0].text
        const shortBylineText = videoRenderer.shortBylineText
          ? videoRenderer.shortBylineText
          : ""
        const lengthText = videoRenderer.lengthText
          ? videoRenderer.lengthText
          : ""
        const channelTitle =
          videoRenderer.ownerText && videoRenderer.ownerText.runs
            ? videoRenderer.ownerText.runs[0].text
            : ""
        return {
          id,
          type: "video",
          thumbnail,
          title,
          channelTitle,
          shortBylineText,
          length: lengthText,
          isLive
        }
      } else {
        return {}
      }
    } catch (ex) {
      throw ex
    }
  }

  async getCompactVideoRenderer(json: any) {
    const compactVideoRendererJson = json.compactVideoRenderer

    var isLive = false
    if (
      compactVideoRendererJson.badges &&
      compactVideoRendererJson.badges.length > 0 &&
      compactVideoRendererJson.badges[0].metadataBadgeRenderer &&
      compactVideoRendererJson.badges[0].metadataBadgeRenderer.style ==
      "BADGE_STYLE_TYPE_LIVE_NOW"
    ) {
      isLive = true
    }
    return {
      id: compactVideoRendererJson.videoId,
      type: "video",
      thumbnail: compactVideoRendererJson.thumbnail.thumbnails,
      title: compactVideoRendererJson.title.simpleText,
      channelTitle: compactVideoRendererJson.shortBylineText.runs[0].text,
      shortBylineText: compactVideoRendererJson.shortBylineText.runs[0].text,
      length: compactVideoRendererJson.lengthText,
      isLive
    }
  }

  async getShortVideo() {
    const page = await this.getYoutubeInitData(youtubeEndpoint)
    const shortResult =
      await page.initdata.contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.richGridRenderer.contents
        .filter((x: any) => {
          return x.richSectionRenderer
        })
        .map((z: any) => z.richSectionRenderer.content)
        .filter((y: any) => y.richShelfRenderer)
        .map((u: any) => u.richShelfRenderer)
        .find((i: any) => i.title.runs[0].text == "Shorts")
    const res = await shortResult.contents
      .map((z: any) => z.richItemRenderer)
      .map((y: any) => y.content.reelItemRenderer)
    return await res.map((json: any) => ({
      id: json.videoId,
      type: "reel",
      thumbnail: json.thumbnail.thumbnails[0],
      title: json.headline.simpleText,
      inlinePlaybackEndpoint: json.inlinePlaybackEndpoint || {}
    }))
  }
}
