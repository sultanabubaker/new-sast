import {WIDTH, HEIGHT} from '../core/constants.js'
import {lerp, unlerp} from '../core/utils.js'
import {api as ViewModule} from '../graphics/ViewModule.js'
/* global PIXI */

export class EndScreenModule {
  constructor (assets) {
    this.states = []
    this.globalData = {}
    this.atEnd = false
  }

  static get moduleName () {
    return 'endScreen'
  }

  updateScene (previousData, currentData, progress) {
    if (currentData.data && progress === 1) {
      this.atEnd = true
    } else {
      this.atEnd = false
    }
  }

  handleFrameData (frameInfo, data) {
    const state = {
      number: frameInfo.number,
      data
    }
    if (data) {
      this.scores = data[0]
      this.tie = data[1]
    }
    this.states.push(state)
    return state
  }

  reinitScene (container, canvasData) {
    this.toDestroy = []
    this.container = container
    this.endLayer = this.createEndScene(this)
    if (this.atEnd) {
      this.initEndScene()
    }
    this.container.addChild(this.endLayer)
  }

  animateScene (delta) {
    let step = Math.min(32, delta)

    if (!ViewModule.options.debugMode && this.atEnd) {
      if (!this.animationEnded) {
        this.renderEndScene(step)
      }
    } else {
      if (this.endTime > 0) {
        this.destroyEndScene()
      }
      this.endTime = 0
    }
  }

  destroyEndScene () {
    this.animationEnded = false
    this.endLayer.visible = false
  }

  initEndScene () {
    this.animationEnded = false
    this.endLayer.visible = true
  }

  renderEndScene (step) {
    var endOfEnd = 10000
    if (this.endTime === 0) {
      this.initEndScene()
    }

    var backS = 0
    var backD = 400
    var backP = unlerp(backS, backS + backD, this.endTime)
    this.endLayer.backgroundRanking.alpha = backP * 0.9

    var logoS = 400
    var logoD = 600
    var logoP = unlerp(logoS, logoS + logoD, this.endTime)
    this.endLayer.titleRanking.scale.set((0.001 + lerp(10, 0.8, logoP)) * 0.65)
    this.endLayer.titleRanking.visible = !!logoP

    var rankS = 1000
    var rankD = 300
    for (let i = 0; i < this.finishers.length; ++i) {
      var p = unlerp(rankS + rankD * i, rankS + rankD * i + rankD, this.endTime)
      this.finishers[i].alpha = p
    }

    this.endTime += step

    if (this.endTime >= endOfEnd) {
      this.animationEnded = true
    }
  }

  handleGlobalData (players, globalData) {
    this.globalData = {
      players: players,
      playerCount: players.length
    }
  }

  generateText (text, size, align, color, forceLato) {
    var textEl
    if (!forceLato) {
      textEl = new PIXI.extras.BitmapText(text, {
        font: size + 'px 04b',
        tint: color
      })
      textEl.lineHeight = size
    } else {
      textEl = new PIXI.Text(text, {
        fontSize: Math.round(size / 1.2) + 'px',
        fontFamily: 'Lato',
        fontWeight: 'bold',
        fill: color
      })
      textEl.lineHeight = Math.round(size / 1.2)
      this.toDestroy.push(textEl)
    }
    if (align === 'right') {
      textEl.anchor.x = 1
    } else if (align === 'center') {
      textEl.anchor.x = 0.5
    }
    return textEl
  }

  createFinisher (finisher, tie) {
    var layer = new PIXI.Container()

    /** ************************************* */
    var avatarContainer = new PIXI.Container()
    avatarContainer.y = 0
    avatarContainer.x = 0

    var backgroundAvatar = new PIXI.Graphics()
    backgroundAvatar.beginFill(0xffffff)
    backgroundAvatar.alpha = 0.1
    backgroundAvatar.drawRect(0, 0, 240, 120)
    avatarContainer.addChild(backgroundAvatar)

    var avatar = PIXI.Sprite.from('$' + finisher.player.index);
    avatar.width = avatar.height = 120

    var rank = this.generateText(finisher.rank.toString(), 76, 'center', finisher.player.color, true)
    rank.anchor.y = 0.5
    rank.position.x = 160
    rank.position.y = 56
    avatarContainer.addChild(rank)

    var rankLetter = this.generateText(finisher.rank === 1 ? 'ST' : 'ND'.toString(), 34, 'left', finisher.player.color, true)
    rankLetter.position.x = 184
    rankLetter.position.y = 32
    avatarContainer.addChild(rankLetter)

    var hudAvatar = new PIXI.Container()
    hudAvatar.addChild(avatar)

    avatarContainer.addChild(hudAvatar)

    /** ************************************* */

    var name = this.generateText(finisher.player.name.toUpperCase(), 76, 'left', finisher.player.color, true)
    var scoreLabel = this.generateText(((finisher.score >= 0) ? finisher.score.toString() + ' wild mana' : '-'), 64, 'left', finisher.player.color, true)

    name.x = 330
    if (tie) {
      name.y = -4
    } else {
      name.y = 25
    }
    scoreLabel.x = 330
    scoreLabel.y = 70

    layer.addChild(avatarContainer)
    layer.addChild(name)
    if (tie) {
      layer.addChild(scoreLabel)
    }
    return layer
  }

  createEndScene () {
    let tie = this.tie
    var layer = new PIXI.Container()

    var background = new PIXI.Graphics()
    background.beginFill(0, 0.85)
    background.drawRect(0, 0, WIDTH, HEIGHT)
    background.endFill()

    layer.backgroundRanking = background

    var titleRanking = PIXI.Sprite.from('logo.png')
    titleRanking.anchor.x = titleRanking.anchor.y = 0.5
    layer.titleRanking = titleRanking

    titleRanking.position.x = WIDTH / 2

    titleRanking.position.y = 275

    var podium = []
    for (var i = 0; i < this.globalData.playerCount; ++i) {
      podium.push({
        score: this.scores[i],
        player: this.globalData.players[i],
        rank: 0
      })
    }
    podium.sort(function (a, b) {
      return b.score - a.score
    })

    this.finishers = []
    var finishers = new PIXI.Container()
    var curRank = 1
    var elem
    for (i = 0; i < podium.length; ++i) {
      if (i > 0 && podium[i - 1].score !== podium[i].score) {
        curRank++
      }

      podium[i].rank = curRank
      elem = this.createFinisher(podium[i], tie)
      finishers.addChild(elem)
      this.finishers.push(elem)
    }

    for (i = 0; i < this.finishers.length; ++i) {
      this.finishers[i].position.x = (WIDTH - this.finishers[0].width) / 2
      this.finishers[i].position.y = 75 + i * 200
    }
    finishers.y = 400

    layer.addChild(background)
    layer.addChild(titleRanking)
    layer.addChild(finishers)

    layer.visible = false
    return layer
  }
}
