/**
* @ingroup app_group (Framework)
* @{
*/

/**
* @file      DataItem.h
* @copyright Copyright 2018, Titan Medical Inc.
*/

#ifndef DATAITEM_H_
#define DATAITEM_H_

#include "DataItemBase.h"
#include "NonCopyable.h"
#include "SignalController.h"
#include "SystemErrorException.h"

namespace Framework
{

    /**
     *
     * @brief
     * Template class for holding arbitrary data
     *
     * @details
     * This class is used to protect reads/writes of data by means of
     * data aspects. The data stored by a data item is arbitrary,
     * but reads must first pass all aspects' BeforeRead calls, and writes
     * must do the same with the BeforeWrite calls. Parallel after read/write
     * functions are called upon completion of the activity.
     *
     * @par Initialization State
     * Data Items may only be created by the Data Store to ensure they are not
     * used outside the context of the controlled Domain Model
     *
     * @par Resource allocation
     * Minimal memory is allocated by this class, except if required by the
     * template class T
     *
     * @par Faults
     * If the data cannot be read an exception is thrown (i.e. deadlock)
     *
     * @par Diagnostics
     * n/a
     *
     * @par Scenarios
     * This class is used to control data in the domain model
     *
     * @par Transaction/Threading/Interrupts
     * DataItems are triggerable, meaning that they can cause other logic
     * to run in the context of the Thread Service. Specifically, upon
     * a successful write to a data item, the data item will trigger and
     * thereby cause any dependent logic to be triggered.
     *
     * @par Algorithms
     * n/a
     *
     * @par Data Structures
     * n/a
     *
     * @par Test Scenarios
     * Verify that apsects are appropriately applied and that upon a successful
     * write the data item triggers.
     */
    template <class T>
    class DataItem : public DataItemBase, private NonCopyable
    {
        public:

            /**
            * @brief Write data to the data item. The data
            * must be written all at once to ensure that only
            * one trigger occurs for a write.
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
            * Upon a successful write, the data item is triggered
            * to allow other logic to run in the thread service
            *
            * @pre {pre-conditions} n/a
            * @post {post-conditions} n/a
            *
            * @param[in]    theItem     the new data to writeee
            *
            * @return n/a
            */
            void Write ( const T &theItem )
            {
                const bool write = BeforeWrite ( true, &theItem, sizeof ( theItem ) );
                if ( write )
                {
                    m_data = theItem;
                    Trigger();
                }

                //always execute 'after stage' - cleans up mutex, etc.
                AfterWrite ( write, &theItem, sizeof ( theItem ) );
            }

            /**
            * @brief Read the data stored in the data item
            *
            * @par Resource Allocation
            * n/a
            *
            * @par Faults
            * If the data item cannot be read, an exception is thrown
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
            * @param[out]   theItem     the read data
            *
            * @return n/a
            */
            void Read ( T &theItem )
            {
                //note that above, 'write' refered to new data -- 'theItem'
                //here within 'read' we refer to the existing data, 'm_data'
                const bool read = BeforeRead ( true, &m_data, sizeof ( theItem ) );
                if ( read )
                {
                    theItem = m_data;
                }
                else
                {
                    //there is a serious problem if we couldn't read the data
                    throw Core::SystemErrorException (
                        Core::Error (
                            Core::ErrorCode ( Core::EErrSystem::Framework, Core::EErrComponent::Runtime, Core::EErrCondition::Corrupt ),
                            Core::GenericValue(),
                            "DataItem<T>::Read encounted invalid content and could not return valid data." ) );

                }

                //always execute 'after stage' - cleans up mutex, etc.
                AfterRead ( read, &m_data, sizeof ( theItem ) );
            }

        private:
            //No one should copy DataItems
            DataItem ( const DataItem<T> &other );

            //ctor is private to restrict who can make one of these
            //since 'DataStore' is a private friend, then only 'DataStore' can create one of these objects
            friend class DataStore;
            template <class ... Ks>
            explicit DataItem ( Ks ... args ) : DataItemBase(), m_data ( T ( args... ) )
            {
            }


            T m_data;
    };

}

#endif
/**
* @}
*/
