export function getPlayer(players, userId){
    return players?.find(player => player.id === userId)
}
