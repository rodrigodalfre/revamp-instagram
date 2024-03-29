import sharp from "sharp";
import { unlink } from "fs/promises";
import fs from 'fs'
import mongoose, {Types} from "mongoose";

//models
import User from '../models/User'
import Profile, {ProfileDocument} from '../models/Profile'
import Post, { IPost, Hashtag, Files, PostDocument } from '../models/Post'

//Types
interface GetPostPopulateResult {
   error?: string,
   post?: PostDocument,
}

export {IPost}

export const userProfile = async(reqUser:Express.User | undefined): Promise<ProfileDocument | Error> => {
   const user = reqUser as InstanceType<typeof User>
   const profile = await Profile.findOne({user: user?.id})

   if(!profile) return new Error('Usuário não existe')

   return profile as ProfileDocument
}

export const validId = async(id:string): Promise<Error | void> => {
   if(!mongoose.Types.ObjectId.isValid(id)) return new Error('ID Inválido')
}

export const checkEditable = async(idProfileUser:string, idProfilePost:string): Promise<Error | void> => {
   if(idProfileUser !== idProfilePost) {
      return new Error('Você não tem permissão para editar esse post')
   }
}

export const captionLength = (caption:string): string | Error => {
   if(caption.length > 2200) return new Error('A legenda excedeu o número de caracteres(2200)')
   return caption
}

export const processHashtag = (caption:string): Hashtag[] => {
   const hashtag:Hashtag[] = []
   if(caption) {
      for(let i = 0; i < caption.length; i++){
         let startOfTag:number = caption.indexOf('#', i)
         if(startOfTag === -1) break

         let endOfTag = caption.indexOf(' ', startOfTag)
         if(endOfTag === -1) {
            caption += " "
            continue
         }

         let tag = caption.substring(startOfTag, endOfTag)
         if(tag && tag.length > 1) {
            hashtag.push({name: tag})
         }
         i = endOfTag
      }
   }
   return hashtag
}

export const addPhotoStorage = async(files:Express.Multer.File[], x:string): Promise<string> => {
   let i = parseInt(x)
   let filename = files[i].filename
   let [type, extension] = files[i].mimetype.split('/')

   if(type === 'image'){
      await sharp(files[i].path)
         .toFile(`./public/media/${filename}.${extension}`)

      sharp.cache(false)
      unlink(files[i].path)
   }

   if(type === 'video'){
      let filename = files[i].filename
      let oldPath = files[i].path
      let newPath = `./public/media/${filename}.${extension}`
      fs.rename(oldPath, newPath, (err) => {
         if(err) console.log(err)
      })
   }
   let file = `${filename}.${extension}`
   return file
}

export const processMedia = async(files:Express.Multer.File[], mediaPost:Files[] | undefined): Promise<Files[]> => {
   let media:Files[] = []
   if(mediaPost){
      media = mediaPost
   }

   for(let i in files) {
      const filename = await addPhotoStorage(files, i)
      media.push({
         url: filename
      })
   }
   return media
}

export const findPostEditable = async(idPost:string, idProfileUser:string): Promise<PostDocument | Error> => {

   const post = await Post.findById(idPost)
   if(!post) return new Error('Post não existe')

   const editable = await checkEditable(idProfileUser, post?.profile?.toString())
   if(editable instanceof Error) return Error(editable.message)

   return post as PostDocument
}

export const createNewPost = async(data:IPost): Promise<PostDocument> => {
   
   const newPost = new Post(data)
   await newPost.save()
   return newPost as PostDocument
}

export const updatePost = async(id:string, update:IPost): Promise<void> => {
   await Post.findByIdAndUpdate(id, {$set: update})   
}

export const removeMedia = async(filename:string, idPost:string):Promise<true> => {
   await Post.updateOne({_id: idPost}, {$pull: {
      files: {url: filename}
   }})

   let pathUrl = `./public/media/${filename}`
   if(fs.existsSync(pathUrl)){
      await unlink(pathUrl)
   }

   return true
}

export const spliceMedia = async (filename:string, moveTo:number, files: Files[] | undefined): Promise<undefined | Files[]> => {
   if(files){
      let changeOrder = files.map(e => e.url)
      let file = changeOrder.indexOf(filename)
      let oldIndex = file
         
      if(file !== -1){
         if(file > moveTo){
            oldIndex = (file + 1)
         }
         changeOrder.splice(moveTo, 0, filename) //MoveTo
         changeOrder.splice(oldIndex, 1) //Delete old Index
      }
   
      const newOrder:Files[] = []
      for(let i in changeOrder){
         newOrder.push({url: changeOrder[i]})
      }
   
      return newOrder
   }
}

export const getPostPopulate = async(id:string): Promise<GetPostPopulateResult> => {
   const isValidId = await validId(id)
   if(isValidId instanceof Error) return { error: isValidId.message }

   const post = await Post.findById(id)
      .populate<{profile: typeof Profile}>({path: 'profile'})
      
   if(!post) {
      return { error: 'Post não existe' };
   }

   return post as GetPostPopulateResult;
}

export const setLike = async(id:string, idProfile:Types.ObjectId): Promise<boolean | Error> => {

   const post = await Post.findById(id)
   if(!post) return new Error('Post não existe')

   const likes = post?.likes?.find(e => e.user == idProfile)

   if(!likes){ //Like the Post
      await Post.findByIdAndUpdate(id, {
         $push: {
            likes: {
               user: idProfile
            }
         }
      })
      return true
   } 
   else { //Dislike the Post
      await Post.findByIdAndUpdate(id, {
         $pull: {
            likes: {
               user: idProfile
            }
         }
      })
      return false
   }
}

export const setComment = async(comment:string, id:string, idUser:Types.ObjectId): Promise<string | Error | PostDocument> => {
   const isValid = await validId(id)
   if(isValid instanceof Error) return isValid.message

   const post = await Post.findByIdAndUpdate(id, {
      $push: {
         comments: {
            idUser,
            comment
         }
      }
   })
   if(!post) return new Error('Post não existe')
   return post as PostDocument
}

export const setReply = async(comment:string, idreply:Types.ObjectId, idUser:Types.ObjectId): Promise<PostDocument | Error> => {

   const post = await Post.findOneAndUpdate({
      comments: {
         $elemMatch: {
            _id: idreply
         },
      },
   }, {
      $push:{
         "comments.$.reply": {
            idUser,
            comment
         }
      }
   })

   if(!post) return new Error('Post não existe')
   return post as PostDocument
}