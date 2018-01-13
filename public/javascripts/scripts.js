function quote(req,res) {
    axios.get('/quoted').then(response => {
        console.log(response.data);
    }).catch(error => console.log(error.toString()));
}
