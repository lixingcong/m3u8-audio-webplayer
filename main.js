const key = 'data'
const defaultData = {'proxy': '', 'useProxy': false, 'playlist': {}}
let data = {}
let hls = null
const video = document.getElementById('video')
const stopBtn = document.getElementById('stop')
const useProxyBtn = document.getElementById('use-proxy')
const proxyInput = document.getElementById('proxy-prefix')
const playingArea = document.getElementById('playing')
const nameEdit = document.getElementById('name')
const urlEdit = document.getElementById('url')

stopBtn.disabled=true
video.addEventListener('play', () => {stopBtn.disabled=false})
video.addEventListener('pause', () => {stopBtn.disabled=true})

const player= {}

player.save = () => {
    const str = JSON.stringify(data)
    localStorage.setItem(key, str)
}

player.load = () => {
    const select = document.getElementById('list')
    select.innerHTML = ''
    for (const name in data.playlist) {
        select.add(new Option(name, name))
    }

    player.onSelectChanged(document.getElementById('list'))

    useProxyBtn.checked = data.useProxy
    proxyInput.disabled=!useProxyBtn.checked
    proxyInput.value = data.proxy
}

const loadDataFromString = (s, overwrite) => {
    try{
        data = JSON.parse(s)

        let needToSave = false
        for(const k in defaultData){
            if(!(k in data)){
                data[k] = defaultData[k]
                needToSave = true
            }
        }
        if(overwrite && needToSave)
            player.save()

        return true
    }catch(e){
        data=defaultData
    }
    return false
}

// read from local storage
loadDataFromString(localStorage.getItem(key), true)
//console.log(data)

useProxyBtn.addEventListener('change', function() {
    data.useProxy = this.checked
    player.save()
    proxyInput.disabled=!this.checked
})

const playUrl = (url) => {
    if (Hls.isSupported()) {
        hls = new Hls();

        var m3u8Url = decodeURIComponent(url);
        hls.loadSource(m3u8Url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            const promise = video.play();

            if (promise !== undefined) {
                promise
                    .then(_ => { /* Autoplay started! */ })
                    .catch(_ => { /* Autoplay was prevented; show a "Play" button for the user. */ });
            }
        });
    }
}

const rfc4648UrlSafeEncode = (url) => {
  const bytes = new TextEncoder().encode(url);
  const base64 = bytes.toBase64();
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

player.stop = () => {
    video.pause()
    video.currentTime=0

    if(hls){
        hls.stopLoad()
        hls = null
    }
}

player.playSelected = () => {
    player.stop()

    const select = document.getElementById('list')
    const selected = select.selectedIndex;
    if(selected>-1){
        const option =  select.options[selected]
        const name  = option.value
        //console.log('try to play', name, data.playlist[name])
        let url = data.playlist[name]

        if(data.useProxy && data.proxy.startsWith('http'))
            url=`${data.proxy}/${rfc4648UrlSafeEncode(url)}`

        playUrl(url)
        playingArea.value=url
    }
}

player.add = () => {
    const name = nameEdit.value
    const url = urlEdit.value

    if(name.length <=0 || url.length<=0){
        alert('Invalid name or url!')
        return
    }

    if(!(name in data.playlist)){
        const select = document.getElementById('list')
        select.add(new Option(name, name))
        //console.log('added', name)
    }
    data.playlist[name] = url
    player.save()
}

player.remove = () => {
    const select = document.getElementById('list')
    const selected = select.selectedIndex;
    if(selected>-1){
        const option =  select.options[selected]
        const name  = option.value

        if (confirm('Remove ' + name + '?')) {
            delete data.playlist[name]
            player.save()
            player.load()
        }
    }
}

player.importList = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = ".json"
    input.onchange = (event) => {
        if(input.files && input.files.length>0){
            const reader = new FileReader();
            reader.onload = (e) => {
                if (confirm('Overwrite current playlist?')) {
                    player.stop()
                    let oldData = {}
                    Object.assign(oldData, data)

                    if(!loadDataFromString(e.target.result, false)){
                        data = oldData
                        alert('Invalid json format')
                    }else{
                        player.save()
                    }

                    player.load()
                }
            };
            reader.readAsText(input.files[0]);
        }
    };
    input.click();
}

player.exportList = () => {
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "export-list.json";
    link.click();
}

player.setProxy = () => {
    let url = proxyInput.value
    if(url.endsWith('/'))
        url=url.slice(0,-1)
    data.proxy = url
    player.save()
}

player.onSelectChanged = (ele) => {
    if(ele.value.length){
        nameEdit.value = ele.value
        urlEdit.value = data.playlist[ele.value]
    }else{
        nameEdit.value = urlEdit.value = ''
    }
}

if (typeof exports==='object') {
    module.exports=player;
} else if (typeof define==='function') {
    define(function(){return player;});
} else {
    this.player=player;
}