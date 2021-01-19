/**
* @ingroup app_group (Framework)
* @{
*/

/**
* @file      DataStore.h
* @copyright Copyright 2018, Titan Medical Inc.
*/

#ifndef DATABASE_H_
#define DATABASE_H_

#include "ITriggerable.h"
#include "DataItem.h"

namespace Framework
{
    // Forward Declarations
    class AspectFactory;
    class DataItemBase;

    /**
     *
     * @brief
     * Factory for creating Data Items
     *
     * @details
     * This class is used to create DataItems in the domain model
     * and automatically set them up for triggering the domain model.
     * It is also used to configure the data aspects upon data item
     * creation
     *
     * @par Initialization State
     * Upon initialization there are no data items owned by the data store
     *
     * @par Resource allocation
     * This class indirectly owns a vector of all data items. It also is
     * responsible for creating many data items. Therefore there is a lot
     * of memory allocated in this class. Because of this, calls through
     * this class should be limited to the beginning and end of the
     * application lifetime
     *
     * @par Faults
     * None
     *
     * @par Diagnostics
     * n/a
     *
     * @par Scenarios
     * This class is used to create data items in the domain
     * model
     *
     * @par Transaction/Threading/Interrupts
     * Data items created using this class are automatically given
     * the same affinity as the data store as a whole, which is
     * likely to be to the thread service
     *
     * @par Algorithms
     * n/a
     *
     * @par Data Structures
     * n/a
     *
     * @par Test Scenarios
     * Verify that data items created have the proper aspects and that
     * they are given the proper thread affinity.
     */
    class DataStore : public ITriggerable
    {


        public:
            /**
            * @brief Constructor. Initializes the cheshire
            * cat with an empty vector. Initializes the affinity
            * to nullptr
            *
            * @par Resource Allocation
            * n/a
            *
            * @par Faults
            * n/a
            *
            * @par Diagnostics
            * n/a
            *
            * @par Transactions/Threading/Interrupts
            * n/a
            *
            * @pre {pre-conditions} n/a
            * @post {post-conditions} n/a
            *
            * @return n/a
            */
            DataStore();

            /**
            * @brief Destructor. Deletes all
            * data items created by this store and the
            * cheshire cat which owns them
            *
            * @par Resource Allocation
            * n/a
            *
            * @par Faults
            * n/a
            *
            * @par Diagnostics
            * n/a
            *
            * @par Transactions/Threading/Interrupts
            * n/a
            *
            * @pre {pre-conditions} n/a
            * @post {post-conditions} n/a
            *
            * @return n/a
            */
            virtual ~DataStore();

            /**
            * @brief Create a data item with the default
            * aspects (all on) and register it to the same
            * affinity as the store
            *
            * @par Resource Allocation
            * Allocates the memory for the new data item
            *
            * @par Faults
            * n/a
            *
            * @par Diagnostics
            * n/a
            *
            * @par Transactions/Threading/Interrupts
            * Sets up thread affinity for the data item to be
            * the same as the store
            *
            * @pre {pre-conditions} n/a
            * @post {post-conditions} n/a
            *
            * @param[in]    args    the constructor arguments for the type T
            *
            * @return the created data item
            */
            template <class T, class ... Ks> DataItem<T> &Create ( Ks ... args )
            {
                DataItem<T>* newItem = new DataItem<T> ( args... );
                SetupAspects ( *newItem ); //factory defaults
                Add ( *newItem );
                newItem->Write ( T ( args... ) );
                return *newItem;
            }

            /**
            * @brief Create a data item with custom
            * aspects and register it to the same
            * affinity as the store
            *
            * @par Resource Allocation
            * Allocates the memory for the new data item
            *
            * @par Faults
            * n/a
            *
            * @par Diagnostics
            * n/a
            *
            * @par Transactions/Threading/Interrupts
            * Sets up thread affinity for the data item to be
            * the same as the store
            *
            * @pre {pre-conditions} n/a
            * @post {post-conditions} n/a
            *
            * @param[in]    factory     the aspect factory to use to create this data item
            * @param[in]    args        the constructor arguments for the type T
            *
            * @return the created data item
            */
            template <class T, class ... Ks> DataItem<T> &Create ( const AspectFactory &factory, Ks ... args )
            {
                DataItem<T>* newItem = new DataItem<T> ( args... );
                SetupAspects ( *newItem, factory ); //custom factory
                Add ( *newItem );
                newItem->Write ( T ( args... ) );
                return *newItem;
            }

            /**
            * @brief Destroys a data item in the store
            *
            * @par Resource Allocation
            * n/a
            *
            * @par Faults
            * n/a
            *
            * @par Diagnostics
            * n/a
            *
            * @par Transactions/Threading/Interrupts
            * n/a
            *
            * @pre {pre-conditions} n/a
            * @post {post-conditions} n/a
            *
            * @param[in]    item    the data item to delete
            *
            * @return n/a
            */
            void Destroy ( DataItemBase &item );


        private:


            //ITriggerable
            virtual void OnTrigger();
            virtual void OnExecuteIfTriggered();
            virtual void OnAffinity ( ITriggerable* affinity );

            void Add ( DataItemBase &newItem );
            void SetupAspects ( DataItemBase &newItem );
            void SetupAspects ( DataItemBase &newItem, const AspectFactory &factory );

            //implementation
            class DatastoreCheshireCat;
            DatastoreCheshireCat &m_cheshireCat;

    };

}

#endif

/**
* @}
*/
